// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, adminClient } from '@/lib/supabase/server'

const createSchema = z.object({
  participantId: z.string().uuid(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use adminClient to bypass the self-referential RLS on conversation_participants
    const { data: userParticipants } = await adminClient
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    const conversationIds = userParticipants?.map((p) => p.conversation_id) ?? []
    if (!conversationIds.length) return NextResponse.json({ conversations: [] })

    const { data: conversations, error } = await adminClient
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          *,
          profile:profiles!conversation_participants_user_id_fkey(id, username, full_name, avatar_url, online_status, last_seen)
        )
      `)
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false })

    if (error) throw error

    // Get unread counts in parallel
    const { data: participantData } = await adminClient
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id)
      .in('conversation_id', conversationIds)

    const unreadCounts: Record<string, number> = {}
    await Promise.all(
      (participantData ?? []).map(async (p) => {
        const { count } = await adminClient
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', p.conversation_id)
          .gt('created_at', p.last_read_at ?? '1970-01-01T00:00:00Z')
          .neq('sender_id', user.id)
        unreadCounts[p.conversation_id] = count ?? 0
      })
    )

    const enriched = (conversations ?? []).map((c) => ({
      ...c,
      unread_count: unreadCounts[c.id] ?? 0,
    }))

    // Deduplicate DM conversations: if the same two users have multiple DM conversations
    // (created before duplicate-prevention was in place), show only the most recent one.
    // Group conversations are never deduplicated.
    const seen = new Set<string>()
    const dedupedConvs = enriched.filter((conv) => {
      if (conv.is_group) return true
      const key = (conv.participants ?? []).map((p) => p.user_id).sort().join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({ conversations: dedupedConvs })
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

    // Find existing DM between these two users (adminClient bypasses RLS)
    const { data: myConvs } = await adminClient
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    const { data: theirConvs } = await adminClient
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', participantId)

    const myIds = new Set(myConvs?.map((c) => c.conversation_id))
    const shared = theirConvs?.find((c) => myIds.has(c.conversation_id))

    if (shared) {
      const { data: conv } = await adminClient
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

    const { error: partInsertError } = await adminClient.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: participantId },
    ])
    if (partInsertError) {
      console.error('[conversations POST] participants insert error:', partInsertError)
      throw partInsertError
    }

    const { data: fullConv } = await adminClient
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
