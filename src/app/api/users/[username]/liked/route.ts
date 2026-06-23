// @ts-nocheck
export const dynamic = 'force-dynamic'
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

    // Get likes by this user, ordered by when they liked
    let likesQuery = supabase
      .from('post_likes')
      .select('post_id, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) likesQuery = likesQuery.lt('created_at', cursor)

    const { data: likes } = await likesQuery
    if (!likes || likes.length === 0) {
      return NextResponse.json({ posts: [], nextCursor: null })
    }

    const postIds = likes.map((l) => l.post_id)

    const { data: posts } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url, is_verified),
        media:post_media(*)
      `)
      .in('id', postIds)
      .eq('is_deleted', false)

    // Preserve order matching the likes order
    const postMap = new Map((posts ?? []).map((p) => [p.id, p]))
    const ordered = postIds.map((id) => postMap.get(id)).filter(Boolean)

    // Mark all as is_liked = true (they liked them), also check current viewer's likes if different user
    let viewerLikedSet = new Set<string>(postIds)
    if (user && user.id !== profile.id && ordered.length) {
      const { data: viewerLikes } = await supabase
        .from('post_likes').select('post_id').eq('user_id', user.id)
        .in('post_id', postIds)
      viewerLikedSet = new Set(viewerLikes?.map((l) => l.post_id))
    }

    const enriched = ordered.map((p) => ({ ...p, is_liked: viewerLikedSet.has(p.id) }))
    const nextCursor = likes.length === limit ? likes[likes.length - 1].created_at : null

    return NextResponse.json({ posts: enriched, nextCursor })
  } catch (err) {
    console.error('[user liked]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
