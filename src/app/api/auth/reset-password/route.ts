export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  password: z.string().min(8).max(72),
})

// User must have a valid recovery session (from clicking the reset link)
export async function POST(req: Request) {
  try {
    const { password } = schema.parse(await req.json())
    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({ password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
