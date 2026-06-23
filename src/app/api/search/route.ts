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
    const q = searchParams.get('q')?.trim()
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!q || q.length < 1) return NextResponse.json({ users: [], posts: [] })

    const results: { users?: unknown[]; posts?: unknown[] } = {}

    if (type === 'users' || type === 'all') {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, is_verified, followers_count, location')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .neq('id', user.id)
        .order('followers_count', { ascending: false })
        .limit(limit)

      // Check which users the current viewer is following
      const userIds = (users ?? []).map((u) => u.id)
      let followingSet = new Set<string>()
      if (userIds.length > 0) {
        const { data: myFollowing } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', userIds)
        followingSet = new Set((myFollowing ?? []).map((f) => f.following_id))
      }

      results.users = (users ?? []).map((u) => ({ ...u, is_following: followingSet.has(u.id) }))
    }

    if (type === 'posts' || type === 'all') {
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id, content, created_at, likes_count, comments_count, user_id,
          author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url, is_verified),
          media:post_media(url, type, order_index)
        `)
        .ilike('content', `%${q}%`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Enrich with like state
      const postIds = (posts ?? []).map((p) => p.id)
      let likedSet = new Set<string>()
      if (postIds.length > 0) {
        const { data: liked } = await supabase
          .from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds)
        likedSet = new Set((liked ?? []).map((l) => l.post_id))
      }

      results.posts = (posts ?? []).map((p) => ({ ...p, is_liked: likedSet.has(p.id) }))
    }

    return NextResponse.json(results)
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
