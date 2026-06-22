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

    const { data: record } = await adminClient
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', 'password_reset')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }

    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users.users.find((u) => u.email === email)

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await adminClient.auth.admin.updateUserById(user.id, { password })
    await adminClient.from('verification_codes').update({ is_used: true }).eq('id', record.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
