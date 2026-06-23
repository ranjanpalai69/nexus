// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, adminClient } from '@/lib/supabase/server'

const createSchema = z.object({
  participantId: z.string().uuid(), // For DM
  message: z.string().min(1).max(2000).optional(),
  type: z.enum(['text', 'image', 'video', 'audio', 'file']).default('text'),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          *,
          profile:profiles!conversation_participants_user_id_fkey(id, username, full_name, avatar_url, online_status, last_seen)
        )
      `)
      .order('last_message_at', { ascending: false })

    if (error) throw error

    // Get unread counts
    const convIds = conversations?.map((c) => c.id) ?? []
    const unreadCounts: Record<string, number> = {}
    if (convIds.length) {
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)
        .in('conversation_id', convIds)

      for (const p of participantData ?? []) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('conversation_id', p.conversation_id)
          .gt('created_at', p.last_read_at)
          .neq('sender_id', user.id)
          .then((r) => ({ count: r.count ?? 0 }))
        unreadCounts[p.conversation_id] = count
      }
    }

    const enriched = conversations?.map((c) => ({
      ...c,
      unread_count: unreadCounts[c.id] ?? 0,
    }))

    return NextResponse.json({ conversations: enriched })
  } catch (err) {
    console.error('[conversations GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { participantId } = createSchema.parse(await req.json())

    // Find shared non-group conversations
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    const { data: theirConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', participantId)

    const myIds = new Set(myConvs?.map((c) => c.conversation_id))
    const shared = theirConvs?.find((c) => myIds.has(c.conversation_id))

    if (shared) {
      const { data: conv } = await supabase
        .from('conversations')
        .select(`*, participants:conversation_participants(*, profile:profiles!conversation_participants_user_id_fkey(id, username, full_name, avatar_url, online_status, last_seen))`)
        .eq('id', shared.conversation_id)
        .eq('is_group', false)
        .single()
      if (conv) return NextResponse.json({ conversation: conv })
    }

    // Create new DM
    const { data: conv, error } = await adminClient
      .from('conversations')
      .insert({ created_by: user.id, is_group: false })
      .select()
      .single()

    if (error) throw error

    await adminClient.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: participantId },
    ])

    const { data: fullConv } = await supabase
      .from('conversations')
      .select(`*, participants:conversation_participants(*, profile:profiles!conversation_participants_user_id_fkey(id, username, full_name, avatar_url, online_status, last_seen))`)
      .eq('id', conv.id)
      .single()

    return NextResponse.json({ conversation: fullConv }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[conversations POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
