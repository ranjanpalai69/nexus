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

    const { data: participant } = await adminClient
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!participant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = 50

    let query = adminClient
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url),
        reply_to:messages!messages_reply_to_id_fkey(
          id, content, type, media_url, file_name,
          sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) query = query.lt('created_at', cursor)

    const { data: messages, error } = await query
    if (error) throw error

    // Mark this user's messages as read
    const readAt = new Date().toISOString()
    await adminClient
      .from('conversation_participants')
      .update({ last_read_at: readAt })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    // Get the OTHER participant's last_read_at so the sender can show "seen" ticks
    const { data: recipientRow } = await adminClient
      .from('conversation_participants')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .maybeSingle()

    // Notify others in the conversation that this user has read up to now
    try {
      emitToConversation(conversationId, 'messages:read', {
        conversationId,
        userId: user.id,
        readAt,
      })
    } catch {}

    const nextCursor = messages && messages.length === limit ? messages[messages.length - 1].created_at : null
    return NextResponse.json({
      messages: messages?.reverse() ?? [],
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

    const { data: participant } = await adminClient
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!participant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { content, type = 'text', mediaUrl, fileName, fileSize, durationSeconds, replyToId, tempId } = body

    const { data: message, error } = await adminClient
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
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url, online_status),
        reply_to:messages!messages_reply_to_id_fkey(
          id, content, type, media_url, file_name,
          sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
        )
      `)
      .single()

    if (error) {
      console.error('[messages POST] insert error:', error)
      throw error
    }
    if (!message) throw new Error('Insert returned no data')

    // Side effects: conversation update + socket notification.
    // Wrapped in try/catch so they NEVER prevent the 201 response — the message
    // is already in the DB at this point.
    try {
      const preview = type === 'text' ? (content?.slice(0, 80) ?? '') : `[${type}]`
      await adminClient.from('conversations').update({
        last_message_at: message.created_at,
        last_message_preview: preview,
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
          lastMessageAt: message.created_at,
          lastMessagePreview: preview,
          senderId: user.id,
        })
      })
    } catch (sideErr) {
      console.error('[messages POST] non-fatal side-effect error:', sideErr)
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    console.error('[messages POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
