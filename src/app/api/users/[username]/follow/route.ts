// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'
import { emitToUser } from '@/lib/socket/server'
import { pushFollow } from '@/lib/push/sender'

export async function POST(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: target } = await supabase.from('profiles').select('id').eq('username', username).single()
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (target.id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', target.id)
      .single()

    if (existing) {
      await adminClient.from('follows').delete().eq('follower_id', user.id).eq('following_id', target.id)

      // Emit updated follower counts to both parties
      const { data: targetProfile } = await adminClient.from('profiles').select('followers_count').eq('id', target.id).single()
      const { data: myProfile } = await adminClient.from('profiles').select('following_count').eq('id', user.id).single()

      emitToUser(target.id, 'user:follow_update', {
        type: 'unfollow', followerId: user.id, followersCount: targetProfile?.followers_count ?? 0,
      })
      emitToUser(user.id, 'user:follow_update', {
        type: 'unfollow', followingId: target.id, followingCount: myProfile?.following_count ?? 0,
      })

      return NextResponse.json({ following: false })
    }

    await adminClient.from('follows').insert({ follower_id: user.id, following_id: target.id })

    const { data: targetProfile } = await adminClient.from('profiles').select('followers_count').eq('id', target.id).single()
    const { data: myProfile } = await adminClient.from('profiles').select('following_count').eq('id', user.id).single()

    emitToUser(target.id, 'user:follow_update', {
      type: 'follow', followerId: user.id, followersCount: targetProfile?.followers_count ?? 0,
    })
    emitToUser(user.id, 'user:follow_update', {
      type: 'follow', followingId: target.id, followingCount: myProfile?.following_count ?? 0,
    })

    // Notification
    const { data: notification } = await adminClient
      .from('notifications')
      .insert({
        recipient_id: target.id,
        actor_id: user.id,
        type: 'follow',
        reference_id: user.id,
        reference_type: 'user',
      })
      .select(`*, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)`)
      .single()

    if (notification) {
      emitToUser(target.id, 'notification:new', notification)
      const actorName = notification.actor?.full_name || notification.actor?.username || 'Someone'
      pushFollow(target.id, actorName).catch(() => {})
    }

    return NextResponse.json({ following: true })
  } catch (err) {
    console.error('[follow]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
