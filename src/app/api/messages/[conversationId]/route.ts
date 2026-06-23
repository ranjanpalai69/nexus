// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'
import { emitToConversation } from '@/lib/socket/server'

export async function GET(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify participant
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!participant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = 50

    let query = supabase
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

    // Update last_read_at
    await adminClient
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    const nextCursor = messages && messages.length === limit ? messages[messages.length - 1].created_at : null
    return NextResponse.json({ messages: messages?.reverse() ?? [], nextCursor })
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

    const { data: participant } = await supabase
      .from('conversation_participants').select('id')
      .eq('conversation_id', conversationId).eq('user_id', user.id).single()
    if (!participant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { content, type = 'text', mediaUrl, fileName, fileSize, durationSeconds, replyToId, tempId } = await req.json()

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

    if (error) throw error

    await adminClient.from('conversations').update({
      last_message_at: message.created_at,
      last_message_preview: type === 'text' ? (content?.slice(0, 80) ?? '') : `[${type}]`,
    }).eq('id', conversationId)

    // Broadcast real-time to all in conversation room
    emitToConversation(conversationId, 'message:new', { ...message, tempId })

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    console.error('[messages POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
