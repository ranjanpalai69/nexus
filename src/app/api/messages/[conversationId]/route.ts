// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'
import { emitToConversation, emitToUser } from '@/lib/socket/server'

export async function GET(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use adminClient to bypass RLS on conversation_participants
    const { data: participant, error: partError } = await adminClient
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (partError) console.error('[messages GET] participant check error:', partError)
    if (!participant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = 50

    let query = adminClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) query = query.lt('created_at', cursor)

    const { data: rawMessages, error: msgError } = await query
    if (msgError) throw msgError

    // Enrich messages with sender profiles
    const messages = rawMessages ?? []
    const senderIds = [...new Set(messages.map((m) => m.sender_id).filter(Boolean))]
    const replyToIds = [...new Set(messages.map((m) => m.reply_to_id).filter(Boolean))]

    const [{ data: profiles }, { data: replyMsgs }] = await Promise.all([
      senderIds.length
        ? adminClient.from('profiles').select('id, username, full_name, avatar_url, online_status').in('id', senderIds)
        : Promise.resolve({ data: [] }),
      replyToIds.length
        ? adminClient.from('messages').select('id, content, type, media_url, file_name, sender_id').in('id', replyToIds)
        : Promise.resolve({ data: [] }),
    ])

    // Collect ALL profile IDs needed (main senders + reply-message senders)
    const replySenderIds = [...new Set((replyMsgs ?? []).map((m) => m.sender_id).filter(Boolean))]
    const missingIds = replySenderIds.filter((id) => !senderIds.includes(id))
    const { data: replyProfiles } = missingIds.length
      ? await adminClient.from('profiles').select('id, username, full_name, avatar_url').in('id', missingIds)
      : { data: [] }

    const profileMap = Object.fromEntries(
      [...(profiles ?? []), ...(replyProfiles ?? [])].map((p) => [p.id, p])
    )
    const replyMap = Object.fromEntries((replyMsgs ?? []).map((m) => [m.id, { ...m, sender: profileMap[m.sender_id] }]))

    const enriched = messages.map((m) => ({
      ...m,
      sender: profileMap[m.sender_id] ?? null,
      reply_to: m.reply_to_id ? (replyMap[m.reply_to_id] ?? null) : null,
    })).reverse()

    // Mark this user's position as read
    const readAt = new Date().toISOString()
    await adminClient
      .from('conversation_participants')
      .update({ last_read_at: readAt })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    // Get the OTHER participant's last_read_at for "seen" ticks
    const { data: recipientRow } = await adminClient
      .from('conversation_participants')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .maybeSingle()

    // Notify the conversation room that this user has read up to now
    try {
      emitToConversation(conversationId, 'messages:read', {
        conversationId,
        userId: user.id,
        readAt,
      })
    } catch {}

    const nextCursor = rawMessages && rawMessages.length === limit ? rawMessages[rawMessages.length - 1].created_at : null
    return NextResponse.json({
      messages: enriched,
      nextCursor,
      recipientLastReadAt: recipientRow?.last_read_at ?? null,
    })
  } catch (err) {
    console.error('[messages GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify caller is a participant (adminClient bypasses RLS)
    const { data: participant, error: partError } = await adminClient
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (partError) console.error('[messages POST] participant check error:', partError)
    if (!participant) {
      console.error('[messages POST] user', user.id, 'not in conversation', conversationId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { content, type = 'text', mediaUrl, fileName, fileSize, durationSeconds, replyToId, tempId } = body

    // Step 1: Insert — only select minimal fields so no FK join can cause failure
    const { data: inserted, error: insertError } = await adminClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content || null,
        type,
        media_url: mediaUrl || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        duration_seconds: durationSeconds || null,
        reply_to_id: replyToId || null,
      })
      .select('id, created_at, conversation_id, sender_id, content, type, media_url, file_name, file_size, duration_seconds, reply_to_id, is_deleted, updated_at')
      .single()

    if (insertError) {
      console.error('[messages POST] insert error:', insertError)
      throw insertError
    }
    if (!inserted) throw new Error('Insert returned no data')

    // Step 2: Enrich with sender + reply_to via separate queries (avoids FK alias issues)
    const [{ data: senderProfile }, { data: replyMsg }] = await Promise.all([
      adminClient.from('profiles').select('id, username, full_name, avatar_url, online_status').eq('id', user.id).single(),
      replyToId
        ? adminClient.from('messages').select('id, content, type, media_url, file_name, sender_id').eq('id', replyToId).single()
        : Promise.resolve({ data: null }),
    ])

    let replyWithSender = null
    if (replyMsg) {
      const { data: replySender } = await adminClient
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', replyMsg.sender_id)
        .single()
      replyWithSender = { ...replyMsg, sender: replySender }
    }

    const message = {
      ...inserted,
      sender: senderProfile ?? null,
      reply_to: replyWithSender,
    }

    // Step 3: Side effects — wrapped so they NEVER prevent the 201 response
    try {
      const preview = type === 'text' ? (content?.slice(0, 80) ?? '') : `[${type}]`

      await adminClient.from('conversations').update({
        last_message_at: inserted.created_at,
        last_message_preview: preview,
        last_message_sender_id: user.id,
      }).eq('id', conversationId)

      emitToConversation(conversationId, 'message:new', { ...message, tempId })

      const { data: others } = await adminClient
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)

      others?.forEach(({ user_id }) => {
        emitToUser(user_id, 'conversation:updated', {
          conversationId,
          lastMessageAt: inserted.created_at,
          lastMessagePreview: preview,
          senderId: user.id,
        })
      })
    } catch (sideErr) {
      console.error('[messages POST] non-fatal side-effect error:', sideErr)
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    console.error('[messages POST] fatal error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
