// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url, is_verified),
        media:post_media(*)
      `)
      .eq('id', postId)
      .eq('is_deleted', false)
      .single()

    if (error || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    let is_liked = false
    if (user) {
      const { data: like } = await supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', user.id).single()
      is_liked = !!like
    }

    return NextResponse.json({ post: { ...post, is_liked } })
  } catch (err) {
    console.error('[post GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await adminClient
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', postId)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[post DELETE]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
