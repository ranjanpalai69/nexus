// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, adminClient } from '@/lib/supabase/server'

const schema = z.object({ content: z.string().min(1).max(500) })

export async function GET(_req: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: comments } = await adminClient
      .from('story_comments')
      .select('*, user:profiles!story_comments_user_id_fkey(id, username, full_name, avatar_url)')
      .eq('story_id', storyId)
      .order('created_at', { ascending: true })

    return NextResponse.json({ comments: comments ?? [] })
  } catch (err) {
    console.error('[story comments GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content } = schema.parse(await req.json())

    const { data: comment, error } = await adminClient
      .from('story_comments')
      .insert({ story_id: storyId, user_id: user.id, content })
      .select('*, user:profiles!story_comments_user_id_fkey(id, username, full_name, avatar_url)')
      .single()

    if (error) throw error
    return NextResponse.json({ comment }, { status: 201 })
  } catch (err) {
    console.error('[story comments POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
