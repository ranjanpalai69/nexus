// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get IDs I follow
    const { data: following } = await supabase
      .from('follows').select('following_id').eq('follower_id', user.id)

    const followingIds = following?.map((f) => f.following_id) ?? []
    if (!followingIds.length) return NextResponse.json({ users: [] })

    // Of those I follow, who also follows me back? = mutual
    const { data: mutual } = await supabase
      .from('follows')
      .select('follower_id, profile:profiles!follows_follower_id_fkey(id, username, full_name, avatar_url, online_status, last_seen)')
      .eq('following_id', user.id)
      .in('follower_id', followingIds)

    const users = mutual?.map((m) => m.profile).filter(Boolean) ?? []
    return NextResponse.json({ users })
  } catch (err) {
    console.error('[mutual GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
