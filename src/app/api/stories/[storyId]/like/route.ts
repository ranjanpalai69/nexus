// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'

export async function POST(_req: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await adminClient
      .from('story_likes')
      .upsert({ story_id: storyId, user_id: user.id }, { onConflict: 'story_id,user_id', ignoreDuplicates: true })

    const { data: story } = await adminClient.from('stories').select('likes_count').eq('id', storyId).maybeSingle()
    return NextResponse.json({ liked: true, likes_count: story?.likes_count ?? 0 })
  } catch (err) {
    console.error('[story like POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await adminClient.from('story_likes').delete().eq('story_id', storyId).eq('user_id', user.id)

    const { data: story } = await adminClient.from('stories').select('likes_count').eq('id', storyId).maybeSingle()
    return NextResponse.json({ liked: false, likes_count: story?.likes_count ?? 0 })
  } catch (err) {
    console.error('[story like DELETE]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
