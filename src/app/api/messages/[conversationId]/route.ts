import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'

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
