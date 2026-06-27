// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email/sender'
import { generateOTP } from '@/lib/utils/otp'
import { rateLimit, rateLimitResponse } from '@/lib/utils/rateLimit'

const schema = z.object({
  email: z.string().email(),
  type:  z.enum(['email_verification', 'password_reset']),
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { success } = await rateLimit(`resend-otp:${ip}`, 5, 3600)
    if (!success) return rateLimitResponse()

    const { email, type } = schema.parse(await req.json())

    // Look up name for personalised email (best-effort)
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    const code = generateOTP(email, type)

    if (type === 'email_verification') {
      sendVerificationEmail(email, code, profile?.full_name || undefined).catch(console.error)
    } else {
      sendPasswordResetEmail(email, code).catch(console.error)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[resend-otp]', err)
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
  }
}
