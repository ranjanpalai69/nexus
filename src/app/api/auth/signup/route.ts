export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/utils/rateLimit'

const schema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
})

// Checks availability only — the actual signUp + confirmation email is done client-side via supabase.auth.signUp()
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { success } = await rateLimit(`signup-check:${ip}`, 20, 3600)
    if (!success) return rateLimitResponse()

    const { username, email } = schema.parse(await req.json())

    const [{ data: existingUsername }, { data: existingEmail }] = await Promise.all([
      adminClient.from('profiles').select('id').eq('username', username).maybeSingle(),
      adminClient.from('profiles').select('id').eq('email', email).maybeSingle(),
    ])

    if (existingUsername) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    if (existingEmail) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

    return NextResponse.json({ available: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[signup-check]', err)
    return NextResponse.json({ error: 'Check failed' }, { status: 500 })
  }
}
