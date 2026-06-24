// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, adminClient } from '@/lib/supabase/server'
import { emitToUser, emitToPost } from '@/lib/socket/server'
import { pushComment, pushReply, pushMention } from '@/lib/push/sender'
import { rateLimit, rateLimitResponse } from '@/lib/utils/rateLimit'

const schema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional(),
})

export async function GET(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { searchParams } = new URL(req.url)
    const parentId = searchParams.get('parentId')
    const cursor = searchParams.get('cursor')
    const limit = 20

    let query = supabase
      .from('comments')
      .select(`
        *,
        author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url, is_verified)
      `)
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (parentId) {
      query = query.eq('parent_id', parentId)
    } else {
      query = query.is('parent_id', null)
    }

    if (cursor) query = query.gt('created_at', cursor)

    const { data: comments, error } = await query
    if (error) throw error

    let likedSet = new Set<string>()
    if (user && comments?.length) {
      const { data: likes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', comments.map((c) => c.id))
      likedSet = new Set(likes?.map((l) => l.comment_id))
    }

    const enriched = comments?.map((c) => ({ ...c, is_liked: likedSet.has(c.id) })) ?? []
    const nextCursor = comments && comments.length === limit ? comments[comments.length - 1].created_at : null

    return NextResponse.json({ comments: enriched, nextCursor })
  } catch (err) {
    console.error('[comments GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success } = await rateLimit(`comment:${user.id}`, 60, 3600)
    if (!success) return rateLimitResponse()

    const { content, parentId } = schema.parse(await req.json())

    const { data: comment, error } = await adminClient
      .from('comments')
      .insert({ post_id: postId, user_id: user.id, content, parent_id: parentId })
      .select(`*, author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url, is_verified)`)
      .single()

    if (error) throw error

    const enrichedComment = { ...comment, is_liked: false }

    // Broadcast new comment to all viewers of this post
    emitToPost(postId, 'post:comment_new', {
      postId,
      comment: enrichedComment,
      parentId: parentId ?? null,
    })

    // Broadcast updated comment count
    const { data: postData } = await adminClient.from('posts').select('comments_count').eq('id', postId).single()
    emitToPost(postId, 'post:comment_count_update', {
      postId,
      commentsCount: postData?.comments_count ?? 0,
    })

    // Notify post owner or parent comment owner
    const { data: post } = await adminClient.from('posts').select('user_id').eq('id', postId).single()
    const notifyUserId = parentId
      ? (await adminClient.from('comments').select('user_id').eq('id', parentId).single()).data?.user_id
      : post?.user_id

    if (notifyUserId && notifyUserId !== user.id) {
      const type = parentId ? 'reply' : 'comment'
      const { data: notification } = await adminClient
        .from('notifications')
        .insert({
          recipient_id: notifyUserId,
          actor_id: user.id,
          type,
          reference_id: comment.id,
          reference_type: 'comment',
        })
        .select(`*, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)`)
        .single()

      // Include post_id so the client can navigate to the correct post
      if (notification) {
        emitToUser(notifyUserId, 'notification:new', { ...notification, post_id: postId })
        const actorName = notification.actor?.full_name || notification.actor?.username || 'Someone'
        const pushFn = parentId ? pushReply : pushComment
        pushFn(notifyUserId, actorName, content).catch(() => {})
      }
    }

    // Send mention notifications
    const mentions = [...new Set([...content.matchAll(/@(\w+)/g)].map((m) => m[1]))]
    if (mentions.length) {
      const { data: mentionedUsers } = await adminClient
        .from('profiles').select('id, username').in('username', mentions).neq('id', user.id)
      for (const mu of mentionedUsers ?? []) {
        if (mu.id === notifyUserId) continue // already notified as post/comment owner
        const { data: n } = await adminClient.from('notifications').insert({
          recipient_id: mu.id, actor_id: user.id,
          type: 'mention', reference_id: comment.id, reference_type: 'comment',
        }).select(`*, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)`).single()
        if (n) {
          emitToUser(mu.id, 'notification:new', { ...n, post_id: postId })
          const actorName = n.actor?.full_name || n.actor?.username || 'Someone'
          pushMention(mu.id, actorName, content).catch(() => {})
        }
      }
    }

    return NextResponse.json({ comment: enrichedComment }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[comments POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
