export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'
import { verifyOTP } from '@/lib/utils/otp'

const schema = z.object({
  email:    z.string().email(),
  code:     z.string().length(6),
  password: z.string().min(8).max(72),
})

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (profile?.id) return profile.id

  const { data: { users } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  return user?.id ?? null
}

export async function POST(req: Request) {
  try {
    const { email, code, password } = schema.parse(await req.json())

    if (!verifyOTP(email, 'password_reset', code)) {
      return NextResponse.json({ error: 'Invalid or expired code. Please request a new one.' }, { status: 400 })
    }

    const userId = await findUserIdByEmail(email)
    if (!userId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const { error } = await adminClient.auth.admin.updateUserById(userId, { password })
    if (error) {
      console.error('[reset-password] updateUserById:', error)
      return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
