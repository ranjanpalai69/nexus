// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let is_following = false
    let is_followed_by = false
    if (user) {
      const [f1, f2] = await Promise.all([
        supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', profile.id).single(),
        supabase.from('follows').select('id').eq('follower_id', profile.id).eq('following_id', user.id).single(),
      ])
      is_following = !!f1.data
      is_followed_by = !!f2.data
    }

    return NextResponse.json({ profile: { ...profile, is_following, is_followed_by, is_own: user?.id === profile.id } })
  } catch (err) {
    console.error('[user GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
