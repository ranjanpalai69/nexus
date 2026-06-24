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

    const { data: userParticipants } = await adminClient
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    const conversationIds = userParticipants?.map((p) => p.conversation_id) ?? []
    if (!conversationIds.length) return NextResponse.json({ conversations: [] })

    // Fetch conversations + current user's read-times in parallel (2 queries instead of serial)
    const [{ data: conversations, error }, { data: participantData }] = await Promise.all([
      adminClient
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            *,
            profile:profiles!conversation_participants_user_id_fkey(id, username, full_name, avatar_url, online_status, last_seen)
          )
        `)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false }),
      adminClient
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)
        .in('conversation_id', conversationIds),
    ])

    if (error) throw error

    // Build per-conversation last_read_at map + find global minimum for batch query
    const lastReadMap: Record<string, string> = {}
    let minLastRead = '9999-01-01T00:00:00Z'
    ;(participantData ?? []).forEach((p) => {
      const t = p.last_read_at ?? '1970-01-01T00:00:00Z'
      lastReadMap[p.conversation_id] = t
      if (t < minLastRead) minLastRead = t
    })
    if (minLastRead === '9999-01-01T00:00:00Z') minLastRead = '1970-01-01T00:00:00Z'

    // Conversations missing last_message_sender_id (migration 005 not applied yet)
    const convsMissingSender = (conversations ?? [])
      .filter((c) => !(c as any).last_message_sender_id && c.last_message_at)
      .map((c) => c.id)

    // Single batch query for unread counts + optional last-sender fallback — run in parallel
    const [{ data: unreadMsgs }, { data: lastMessages }] = await Promise.all([
      // ONE query replaces N parallel per-conversation count queries
      adminClient
        .from('messages')
        .select('conversation_id, created_at')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .gt('created_at', minLastRead),
      // Zero queries if migration 005 ran; one query otherwise
      convsMissingSender.length
        ? adminClient
            .from('messages')
            .select('conversation_id, sender_id')
            .in('conversation_id', convsMissingSender)
            .order('created_at', { ascending: false })
            .limit(convsMissingSender.length * 10)
        : Promise.resolve({ data: [] as any[] }),
    ])

    // Count unreads per conversation using the per-conversation last_read_at
    const unreadCounts: Record<string, number> = {}
    ;(unreadMsgs ?? []).forEach((msg) => {
      const lastRead = lastReadMap[msg.conversation_id] ?? '1970-01-01T00:00:00Z'
      if (msg.created_at > lastRead) {
        unreadCounts[msg.conversation_id] = (unreadCounts[msg.conversation_id] ?? 0) + 1
      }
    })

    // Build last-sender map (first entry per conversation = most recent)
    const lastSenderMap: Record<string, string | null> = {}
    ;(lastMessages ?? []).forEach((msg) => {
      if (!lastSenderMap[msg.conversation_id]) {
        lastSenderMap[msg.conversation_id] = msg.sender_id
      }
    })

    const enriched = (conversations ?? []).map((c) => ({
      ...c,
      unread_count: unreadCounts[c.id] ?? 0,
      last_message_sender_id:
        (c as any).last_message_sender_id ?? lastSenderMap[c.id] ?? null,
    }))

    // Deduplicate DM conversations (guard against pre-dedup data)
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
    const [{ data: myConvs }, { data: theirConvs }] = await Promise.all([
      adminClient.from('conversation_participants').select('conversation_id').eq('user_id', user.id),
      adminClient.from('conversation_participants').select('conversation_id').eq('user_id', participantId),
    ])

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
