export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  password: z.string().min(8).max(72),
})

export async function POST(req: Request) {
  try {
    const { email, code, password } = schema.parse(await req.json())

    // Verify OTP against verification_codes table
    const { data: record, error: lookupError } = await adminClient
      .from('verification_codes')
      .select('id, user_id')
      .eq('email', email)
      .eq('code', code)
      .eq('type', 'password_reset')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lookupError || !record || !record.user_id) {
      return NextResponse.json({ error: 'Invalid or expired code. Please request a new one.' }, { status: 400 })
    }

    // Mark OTP as used
    await adminClient
      .from('verification_codes')
      .update({ is_used: true })
      .eq('id', record.id)

    // Set new password via admin API — no recovery session needed
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      record.user_id as string,
      { password }
    )

    if (updateError) {
      console.error('[reset-password] updateUserById error:', updateError)
      return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
