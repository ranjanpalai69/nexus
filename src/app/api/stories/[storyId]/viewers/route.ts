// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only the story owner may see the viewers list
    const { data: story } = await adminClient
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .maybeSingle()
    if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (story.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: viewers } = await adminClient
      .from('story_views')
      .select('viewed_at, viewer:profiles!story_views_viewer_id_fkey(id, username, full_name, avatar_url)')
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false })

    return NextResponse.json({ viewers: viewers ?? [] })
  } catch (err) {
    console.error('[story viewers GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
