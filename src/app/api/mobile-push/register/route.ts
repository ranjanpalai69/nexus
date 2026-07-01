export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'

const schema = z.object({
  token: z.string().min(1),
  userId: z.string().uuid(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, userId } = schema.parse(body)

    // Cast to any because push_subscriptions may not be in the generated Supabase types yet
    const db = adminClient as unknown as { from: (t: string) => any }

    const { error } = await db.from('push_subscriptions').upsert(
      { user_id: userId, token, type: 'expo', updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token', ignoreDuplicates: false }
    )

    // If the table has no `type` column yet, retry without it
    if (error?.message?.includes('column "type"') || error?.message?.includes('"type" column')) {
      await db.from('push_subscriptions').upsert(
        { user_id: userId, token, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token', ignoreDuplicates: false }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('[mobile-push/register]', err)
    return NextResponse.json({ error: 'Failed to register push token' }, { status: 500 })
  }
}
