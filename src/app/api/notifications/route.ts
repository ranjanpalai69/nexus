// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = 30

    let query = supabase
      .from('notifications')
      .select(`*, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)`)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) query = query.lt('created_at', cursor)

    const { data: notifications, error } = await query
    if (error) throw error

    // For comment-type notifications, reference_id is the comment ID.
    // We need the parent post_id so the click navigates to the right post.
    const commentNotifs = (notifications ?? []).filter(
      (n) => n.reference_type === 'comment' && n.reference_id
    )

    let commentPostMap: Record<string, string> = {}
    if (commentNotifs.length) {
      const { data: comments } = await adminClient
        .from('comments')
        .select('id, post_id')
        .in('id', commentNotifs.map((n) => n.reference_id))
      commentPostMap = Object.fromEntries((comments ?? []).map((c) => [c.id, c.post_id]))
    }

    const enriched = (notifications ?? []).map((n) => ({
      ...n,
      post_id: n.reference_type === 'comment' ? (commentPostMap[n.reference_id] ?? null) : null,
    }))

    const nextCursor =
      notifications && notifications.length === limit
        ? notifications[notifications.length - 1].created_at
        : null

    return NextResponse.json({ notifications: enriched, nextCursor })
  } catch (err) {
    console.error('[notifications GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ids, markAll } = await req.json()

    if (markAll) {
      await adminClient
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)
    } else if (ids?.length) {
      await adminClient
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids)
        .eq('recipient_id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[notifications PATCH]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
