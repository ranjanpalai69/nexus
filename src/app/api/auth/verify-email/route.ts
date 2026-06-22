import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email/sender'

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, code } = schema.parse(body)

    const { data: record } = await adminClient
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', 'email_verification')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }

    // Mark code as used
    await adminClient
      .from('verification_codes')
      .update({ is_used: true })
      .eq('id', record.id)

    // Confirm user email in Supabase Auth
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users.users.find((u) => u.email === email)
    if (user) {
      await adminClient.auth.admin.updateUserById(user.id, { email_confirm: true })

      // Get profile for welcome email
      const { data: profile } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      sendWelcomeEmail(email, profile?.full_name || 'there').catch(console.error)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('[verify-email]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
