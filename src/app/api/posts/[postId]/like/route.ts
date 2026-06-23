// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'
import { emitToUser } from '@/lib/socket/server'

export async function POST(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      // Unlike
      await adminClient.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
      return NextResponse.json({ liked: false })
    }

    // Like
    await adminClient.from('post_likes').insert({ post_id: postId, user_id: user.id })

    // Notify post owner
    const { data: post } = await adminClient.from('posts').select('user_id').eq('id', postId).single()
    if (post && post.user_id !== user.id) {
      const { data: notification } = await adminClient
        .from('notifications')
        .insert({
          recipient_id: post.user_id,
          actor_id: user.id,
          type: 'like_post',
          reference_id: postId,
          reference_type: 'post',
        })
        .select(`*, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)`)
        .single()

      if (notification) emitToUser(post.user_id, 'notification:new', notification)
    }

    return NextResponse.json({ liked: true })
  } catch (err) {
    console.error('[like]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
