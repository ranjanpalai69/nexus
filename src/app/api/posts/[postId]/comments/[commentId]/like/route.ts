import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const { commentId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: existing } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      await adminClient.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id)
      return NextResponse.json({ liked: false })
    }

    await adminClient.from('comment_likes').insert({ comment_id: commentId, user_id: user.id })
    return NextResponse.json({ liked: true })
  } catch (err) {
    console.error('[comment like]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
