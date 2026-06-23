// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'
import { emitToUser } from '@/lib/socket/server'

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
      // Unfollow
      await adminClient.from('follows').delete().eq('follower_id', user.id).eq('following_id', target.id)
      return NextResponse.json({ following: false })
    }

    // Follow
    await adminClient.from('follows').insert({ follower_id: user.id, following_id: target.id })

    // Notify
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

    if (notification) emitToUser(target.id, 'notification:new', notification)

    return NextResponse.json({ following: true })
  } catch (err) {
    console.error('[follow]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
