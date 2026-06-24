// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const subscription = await req.json()
    if (!subscription?.endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

    // Upsert by endpoint — replace existing for this endpoint
    const { data: existing } = await adminClient
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('subscription->>endpoint', subscription.endpoint)
      .single()

    if (existing) {
      await adminClient.from('push_subscriptions').update({ subscription }).eq('id', existing.id)
    } else {
      await adminClient.from('push_subscriptions').insert({ user_id: user.id, subscription })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint } = await req.json()
    if (endpoint) {
      await adminClient.from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('subscription->>endpoint', endpoint)
    } else {
      await adminClient.from('push_subscriptions').delete().eq('user_id', user.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe DELETE]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
