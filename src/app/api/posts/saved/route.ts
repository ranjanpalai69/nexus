// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = 20

    let savesQuery = supabase
      .from('post_saves')
      .select('post_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) savesQuery = savesQuery.lt('created_at', cursor)

    const { data: saves } = await savesQuery
    if (!saves || saves.length === 0) return NextResponse.json({ posts: [], nextCursor: null })

    const postIds = saves.map((s) => s.post_id)

    const { data: posts } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url, is_verified),
        media:post_media(*)
      `)
      .in('id', postIds)
      .eq('is_deleted', false)

    // Enrich with like/save state
    const postMap = new Map((posts ?? []).map((p) => [p.id, p]))
    const ordered = postIds.map((id) => postMap.get(id)).filter(Boolean)

    const { data: liked } = await supabase
      .from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds)
    const likedSet = new Set((liked ?? []).map((l) => l.post_id))

    const enriched = ordered.map((p) => ({ ...p, is_liked: likedSet.has(p.id), is_saved: true }))
    const nextCursor = saves.length === limit ? saves[saves.length - 1].created_at : null

    return NextResponse.json({ posts: enriched, nextCursor })
  } catch (err) {
    console.error('[saved posts]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
