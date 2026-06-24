// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, adminClient } from '@/lib/supabase/server'
import { emitToUser } from '@/lib/socket/server'

const schema = z.object({
  mediaUrl:  z.string().url(),
  mediaType: z.enum(['image', 'video']),
  caption:   z.string().max(300).optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Stories from people the user follows + own stories, not expired
    const { data: following } = await supabase
      .from('follows').select('following_id').eq('follower_id', user.id)
    const ids = [...(following ?? []).map((f) => f.following_id), user.id]

    const { data: stories, error: storiesError } = await adminClient
      .from('stories')
      .select(`*, author:profiles!stories_user_id_fkey(id, username, full_name, avatar_url, is_verified)`)
      .in('user_id', ids)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (storiesError) {
      console.error('[stories GET] query error (run migration 002_stories_v2.sql):', storiesError.message)
      return NextResponse.json({ groups: [] })
    }

    const storyIds = (stories ?? []).map((s) => s.id)

    // Get which stories current user has viewed
    let viewedSet = new Set<string>()
    if (storyIds.length) {
      const { data: views } = await adminClient
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', user.id)
        .in('story_id', storyIds)
      if (views) viewedSet = new Set(views.map((v) => v.story_id))
    }

    // Get which stories current user has liked (story_likes table may not exist yet)
    let likedSet = new Set<string>()
    if (storyIds.length) {
      const { data: likes, error: likesError } = await supabase
        .from('story_likes')
        .select('story_id')
        .eq('user_id', user.id)
        .in('story_id', storyIds)
      if (!likesError && likes) {
        likedSet = new Set(likes.map((l) => l.story_id))
      }
    }

    // Group by user
    const grouped: Record<string, { user: object; stories: object[]; hasUnviewed: boolean }> = {}
    for (const story of stories ?? []) {
      const uid = story.user_id
      if (!grouped[uid]) grouped[uid] = { user: story.author, stories: [], hasUnviewed: false }
      const viewed = viewedSet.has(story.id)
      grouped[uid].stories.push({
        ...story,
        viewed,
        liked_by_me: likedSet.has(story.id),
        likes_count: story.likes_count ?? 0,
      })
      if (!viewed) grouped[uid].hasUnviewed = true
    }

    // Own stories first, then unviewed, then viewed
    const sorted = Object.values(grouped).sort((a: any, b: any) => {
      if ((a.user as any).id === user.id) return -1
      if ((b.user as any).id === user.id) return 1
      if (a.hasUnviewed && !b.hasUnviewed) return -1
      if (!a.hasUnviewed && b.hasUnviewed) return 1
      return 0
    })

    return NextResponse.json({ groups: sorted })
  } catch (err) {
    console.error('[stories GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { mediaUrl, mediaType, caption } = schema.parse(await req.json())

    const { data: story, error } = await adminClient
      .from('stories')
      .insert({ user_id: user.id, media_url: mediaUrl, media_type: mediaType, caption })
      .select(`*, author:profiles!stories_user_id_fkey(id, username, full_name, avatar_url)`)
      .single()

    if (error) throw error

    // Notify followers in real-time so their stories bar updates immediately
    try {
      const { data: followers } = await adminClient
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)

      const payload = { userId: user.id }
      ;(followers ?? []).forEach(({ follower_id }) => emitToUser(follower_id, 'story:new', payload))
      emitToUser(user.id, 'story:new', payload)
    } catch {
      // real-time notification is best-effort
    }

    return NextResponse.json({ story }, { status: 201 })
  } catch (err) {
    console.error('[stories POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
