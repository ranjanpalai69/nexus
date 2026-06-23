// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'
import { emitToUser, emitToPost } from '@/lib/socket/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const { postId, commentId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: existing } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      await adminClient.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id)

      const { data: commentData } = await adminClient
        .from('comments').select('likes_count').eq('id', commentId).single()

      emitToPost(postId, 'comment:like_update', {
        postId, commentId, userId: user.id, liked: false, likesCount: commentData?.likes_count ?? 0,
      })

      return NextResponse.json({ liked: false })
    }

    await adminClient.from('comment_likes').insert({ comment_id: commentId, user_id: user.id })

    const { data: commentData } = await adminClient
      .from('comments').select('likes_count, user_id').eq('id', commentId).single()

    emitToPost(postId, 'comment:like_update', {
      postId, commentId, userId: user.id, liked: true, likesCount: commentData?.likes_count ?? 0,
    })

    // Notify comment owner
    if (commentData && commentData.user_id !== user.id) {
      const { data: notification } = await adminClient
        .from('notifications')
        .insert({
          recipient_id: commentData.user_id,
          actor_id: user.id,
          type: 'like_comment',
          reference_id: commentId,
          reference_type: 'comment',
        })
        .select(`*, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)`)
        .single()

      if (notification) emitToUser(commentData.user_id, 'notification:new', notification)
    }

    return NextResponse.json({ liked: true })
  } catch (err) {
    console.error('[comment like]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
