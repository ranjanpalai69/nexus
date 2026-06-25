// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email/sender'
import { generateOTP } from '@/lib/utils/helpers'
import { rateLimit, rateLimitResponse } from '@/lib/utils/rateLimit'

const schema = z.object({
  email: z.string().email(),
  type: z.enum(['email_verification', 'password_reset']),
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { success } = await rateLimit(`resend-otp:${ip}`, 5, 3600)
    if (!success) return rateLimitResponse()

    const { email, type } = schema.parse(await req.json())

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .single()

    if (profile) {
      const code = generateOTP(6)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

      await adminClient.from('verification_codes').insert({
        email,
        user_id: profile.id,
        code,
        type,
        expires_at: expiresAt,
      })

      if (type === 'email_verification') {
        await sendVerificationEmail(email, code, profile.full_name || undefined).catch(console.error)
      } else {
        await sendPasswordResetEmail(email, code).catch(console.error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[resend-otp]', err)
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
  }
}
