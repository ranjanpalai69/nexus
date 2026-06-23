export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rget, rset } from '@/lib/redis/client'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()
    const type = searchParams.get('type') || 'all' // 'users' | 'posts' | 'all'
    const limit = 20

    if (!q || q.length < 1) return NextResponse.json({ users: [], posts: [] })

    const cacheKey = `search:${type}:${q.toLowerCase()}`
    const useCache = !!process.env.REDIS_URL
    if (useCache) {
      const cached = await rget(cacheKey).catch(() => null)
      if (cached) return NextResponse.json(JSON.parse(cached))
    }

    const results: { users?: unknown[]; posts?: unknown[] } = {}

    if (type === 'users' || type === 'all') {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, is_verified, followers_count')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .order('followers_count', { ascending: false })
        .limit(limit)
      results.users = users ?? []
    }

    if (type === 'posts' || type === 'all') {
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id, content, created_at, likes_count, comments_count,
          author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url, is_verified),
          media:post_media(url, type, order_index)
        `)
        .ilike('content', `%${q}%`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit)
      results.posts = posts ?? []
    }

    if (useCache) rset(cacheKey, JSON.stringify(results), 30).catch(() => null)

    return NextResponse.json(results)
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
