import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'
import { sendVerificationEmail } from '@/lib/email/sender'
import { generateOTP } from '@/lib/utils/helpers'
import { rateLimit, rateLimitResponse } from '@/lib/utils/rateLimit'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  fullName: z.string().min(1).max(100),
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { success } = await rateLimit(`signup:${ip}`, 5, 3600)
    if (!success) return rateLimitResponse()

    const body = await req.json()
    const data = schema.parse(body)

    // Check username availability
    const { data: existing } = await adminClient
      .from('profiles')
      .select('id')
      .eq('username', data.username)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false,
      user_metadata: { username: data.username, full_name: data.fullName },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }
      throw authError
    }

    // Generate and store verification code
    const code = generateOTP(6)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await adminClient.from('verification_codes').insert({
      email: data.email,
      code,
      type: 'email_verification',
      expires_at: expiresAt,
    })

    await sendVerificationEmail(data.email, code, data.fullName)

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('[signup]', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
