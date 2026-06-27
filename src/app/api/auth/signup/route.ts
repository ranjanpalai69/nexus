export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/utils/rateLimit'
import { generateOTP } from '@/lib/utils/otp'
import { sendVerificationEmail } from '@/lib/email/sender'

const schema = z.object({
  username:  z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers and underscores only'),
  email:     z.string().email('Invalid email address'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  fullName:  z.string().min(1, 'Full name is required').max(100),
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

    // Duplicate checks
    const [{ data: takenUsername }, { data: takenEmail }] = await Promise.all([
      adminClient.from('profiles').select('id').eq('username', username).maybeSingle(),
      adminClient.from('profiles').select('id').eq('email', email).maybeSingle(),
    ])
    if (takenUsername) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    if (takenEmail)    return NextResponse.json({ error: 'Email already registered. Try logging in.' }, { status: 409 })

    // Create auth user with email unconfirmed
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
      console.error('[signup] createUser:', authError)
      return NextResponse.json({ error: 'Could not create account. Please try again.' }, { status: 500 })
    }

    const userId = authData.user.id

    // Upsert profile — gracefully ignore unknown column errors
    await adminClient.from('profiles').upsert(
      { id: userId, email, username, full_name: fullName, avatar_url: null, email_confirmed: false },
      { onConflict: 'id' }
    ).then(({ error }) => {
      if (error) {
        // email_confirmed column may not exist yet — retry without it
        if (error.message?.includes('email_confirmed')) {
          return adminClient.from('profiles').upsert(
            { id: userId, email, username, full_name: fullName, avatar_url: null },
            { onConflict: 'id' }
          )
        }
        console.warn('[signup] profile upsert:', error.message)
      }
    })

    // Generate HMAC OTP (no database table required)
    const code = generateOTP(email, 'email_verification')

    // Fire-and-forget — response returns immediately, email sends in background
    sendVerificationEmail(email, code, fullName).catch((err: unknown) => {
      console.error('[signup] email failed:', err instanceof Error ? err.message : err)
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
