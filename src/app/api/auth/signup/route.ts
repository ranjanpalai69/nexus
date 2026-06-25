export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/utils/rateLimit'
import { generateOTP } from '@/lib/utils/helpers'
import { sendVerificationEmail } from '@/lib/email/sender'

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required').max(100),
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { success } = await rateLimit(`signup:${ip}`, 10, 3600)
    if (!success) return rateLimitResponse()

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }
    const { username, email, password, fullName } = parsed.data

    const [{ data: takenUsername }, { data: takenEmail }] = await Promise.all([
      adminClient.from('profiles').select('id').eq('username', username).maybeSingle(),
      adminClient.from('profiles').select('id').eq('email', email).maybeSingle(),
    ])

    if (takenUsername) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    if (takenEmail)    return NextResponse.json({ error: 'Email already registered. Try logging in.' }, { status: 409 })

    // Create user — email_confirm: false so sign-in requires OTP verification first
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { username, full_name: fullName },
    })

    if (authError) {
      const msg = authError.message || ''
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
        return NextResponse.json({ error: 'Email already registered. Try logging in.' }, { status: 409 })
      }
      console.error('[signup] admin.createUser error:', authError)
      return NextResponse.json({ error: 'Could not create account. Please try again.' }, { status: 500 })
    }

    const userId = authData.user.id

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      email,
      username,
      full_name: fullName,
      avatar_url: null,
    }, { onConflict: 'id', ignoreDuplicates: true })

    if (profileError) {
      console.warn('[signup] profile upsert warning:', profileError.message)
    }

    // Generate 6-digit OTP, store in DB, send via Resend (works with all domains)
    const code = generateOTP(6)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await adminClient.from('verification_codes').insert({
      email,
      user_id: userId,
      code,
      type: 'email_verification',
      expires_at: expiresAt,
    })

    await sendVerificationEmail(email, code, fullName).catch((err: unknown) => {
      console.error('[signup] sendVerificationEmail failed:', err)
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('[signup]', err)
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
