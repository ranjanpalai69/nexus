// @ts-nocheck
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/utils/rateLimit'

const createSchema = z.object({
  content: z.string().max(2000).optional(),
  media: z.array(z.object({
    url: z.string().url(),
    type: z.enum(['image', 'video']),
    thumbnailUrl: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    sizeBytes: z.number().optional(),
    durationSeconds: z.number().optional(),
    orderIndex: z.number(),
  })).max(10).optional(),
}).refine((d) => d.content || (d.media && d.media.length > 0), {
  message: 'Post must have content or media',
})

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const type = searchParams.get('type') || 'feed' // 'feed' | 'explore'

    let query = supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url, is_verified),
        media:post_media(*)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type === 'feed') {
      // Posts from people we follow + our own
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = following?.map((f) => f.following_id) ?? []
      followingIds.push(user.id)
      query = query.in('user_id', followingIds)
    }

    if (cursor) query = query.lt('created_at', cursor)

    const { data: posts, error } = await query

    if (error) throw error

    // Fetch liked status for current user
    const postIds = posts?.map((p) => p.id) ?? []
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)

    const likedSet = new Set(likes?.map((l) => l.post_id))

    const enriched = posts?.map((p) => ({
      ...p,
      is_liked: likedSet.has(p.id),
    })) ?? []

    const nextCursor = posts && posts.length === limit ? posts[posts.length - 1].created_at : null

    return NextResponse.json({ posts: enriched, nextCursor })
  } catch (err) {
    console.error('[posts GET]', err)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success } = await rateLimit(`post:${user.id}`, 30, 3600)
    if (!success) return rateLimitResponse()

    const body = createSchema.parse(await req.json())

    const { data: post, error } = await adminClient
      .from('posts')
      .insert({ user_id: user.id, content: body.content })
      .select(`*, author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url, is_verified)`)
      .single()

    if (error) throw error

    let media: ReturnType<typeof Object.assign>[] = []
    if (body.media?.length) {
      const { data: mediaRows } = await adminClient
        .from('post_media')
        .insert(body.media.map((m) => ({
          post_id: post.id,
          url: m.url,
          type: m.type,
          thumbnail_url: m.thumbnailUrl,
          width: m.width,
          height: m.height,
          size_bytes: m.sizeBytes,
          duration_seconds: m.durationSeconds,
          order_index: m.orderIndex,
        })))
        .select()
      media = mediaRows ?? []
    }

    return NextResponse.json({ post: { ...post, media, is_liked: false } }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[posts POST]', err)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
