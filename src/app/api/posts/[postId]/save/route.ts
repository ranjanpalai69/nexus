// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'

export async function POST(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if already saved
    const { data: existing } = await supabase
      .from('post_saves')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      await adminClient.from('post_saves').delete().eq('post_id', postId).eq('user_id', user.id)
      return NextResponse.json({ saved: false })
    }

    await adminClient.from('post_saves').insert({ post_id: postId, user_id: user.id })
    return NextResponse.json({ saved: true })
  } catch (err) {
    console.error('[post save]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
