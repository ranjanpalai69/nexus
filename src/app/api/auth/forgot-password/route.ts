import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'
import { sendPasswordResetEmail } from '@/lib/email/sender'
import { generateOTP } from '@/lib/utils/helpers'
import { rateLimit, rateLimitResponse } from '@/lib/utils/rateLimit'

const schema = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { success } = await rateLimit(`forgot:${ip}`, 3, 3600)
    if (!success) return rateLimitResponse()

    const { email } = schema.parse(await req.json())

    // Don't reveal if user exists
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users.users.find((u) => u.email === email)

    if (user) {
      const code = generateOTP(6)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

      await adminClient.from('verification_codes').insert({
        email,
        code,
        type: 'password_reset',
        expires_at: expiresAt,
      })

      await sendPasswordResetEmail(email, code)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[forgot-password]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
