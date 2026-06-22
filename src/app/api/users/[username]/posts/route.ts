import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single()
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = 20

    let query = supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url, is_verified),
        media:post_media(*)
      `)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) query = query.lt('created_at', cursor)

    const { data: posts } = await query

    let likedSet = new Set<string>()
    if (user && posts?.length) {
      const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', posts.map((p) => p.id))
      likedSet = new Set(likes?.map((l) => l.post_id))
    }

    const enriched = posts?.map((p) => ({ ...p, is_liked: likedSet.has(p.id) })) ?? []
    const nextCursor = posts && posts.length === limit ? posts[posts.length - 1].created_at : null

    return NextResponse.json({ posts: enriched, nextCursor })
  } catch (err) {
    console.error('[user posts]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
