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

    await adminClient.from('story_views').upsert({ story_id: storyId, viewer_id: user.id })
    await adminClient.from('stories').update({ views_count: adminClient.raw('views_count + 1') }).eq('id', storyId).neq('user_id', user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[story view]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
