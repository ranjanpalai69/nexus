// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = 20

    const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single()
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let query = supabase
      .from('follows')
      .select(`
        id, created_at,
        following:profiles!follows_following_id_fkey(id, username, full_name, avatar_url, is_verified, bio)
      `)
      .eq('follower_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) query = query.lt('created_at', cursor)

    const { data, error } = await query
    if (error) throw error

    const nextCursor = data && data.length === limit ? data[data.length - 1].created_at : null
    return NextResponse.json({ users: data?.map((d) => d.following), nextCursor })
  } catch (err) {
    console.error('[following]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
