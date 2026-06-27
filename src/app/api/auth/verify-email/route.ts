// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'
import { verifyOTP } from '@/lib/utils/otp'
import { sendWelcomeEmail } from '@/lib/email/sender'

const schema = z.object({
  email: z.string().email(),
  code:  z.string().length(6),
})

async function findUserIdByEmail(email: string): Promise<string | null> {
  // Try profiles table first (email column set during signup)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (profile?.id) return profile.id

  // Fallback: scan auth users (handles missing email column in profiles)
  const { data: { users } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  return user?.id ?? null
}

export async function POST(req: Request) {
  try {
    const { email, code } = schema.parse(await req.json())

    if (!verifyOTP(email, 'email_verification', code)) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }

    const userId = await findUserIdByEmail(email)
    if (!userId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Confirm email in Supabase Auth
    await adminClient.auth.admin.updateUserById(userId, { email_confirm: true })

    // Update profiles.email_confirmed if the column exists
    await adminClient
      .from('profiles')
      .update({ email_confirmed: true })
      .eq('id', userId)
      .then(({ error }) => {
        if (error && !error.message?.includes('email_confirmed')) {
          console.warn('[verify-email] profile update:', error.message)
        }
      })

    // Welcome email fire-and-forget
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()

    sendWelcomeEmail(email, profile?.full_name || 'there').catch(console.error)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('[verify-email]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
