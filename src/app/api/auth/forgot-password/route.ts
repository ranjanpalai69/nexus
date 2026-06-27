// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'
import { generateOTP } from '@/lib/utils/otp'
import { sendPasswordResetEmail } from '@/lib/email/sender'
import { rateLimit, rateLimitResponse } from '@/lib/utils/rateLimit'

const schema = z.object({ email: z.string().email() })

async function userExistsByEmail(email: string): Promise<boolean> {
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (profile) return true

  const { data: { users } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  return users.some((u) => u.email?.toLowerCase() === email.toLowerCase())
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { success } = await rateLimit(`forgot:${ip}`, 3, 3600)
    if (!success) return rateLimitResponse()

    const { email } = schema.parse(await req.json())

    // Always return success to not reveal whether email exists
    const exists = await userExistsByEmail(email)
    if (exists) {
      const code = generateOTP(email, 'password_reset')
      sendPasswordResetEmail(email, code).catch((err) => {
        console.error('[forgot-password] email failed:', err instanceof Error ? err.message : err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[forgot-password]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
