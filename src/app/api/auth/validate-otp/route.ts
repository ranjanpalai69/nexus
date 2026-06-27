export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyOTP } from '@/lib/utils/otp'

const schema = z.object({
  email: z.string().email(),
  type:  z.enum(['email_verification', 'password_reset']),
  code:  z.string().length(6),
})

export async function POST(req: Request) {
  try {
    const { email, type, code } = schema.parse(await req.json())
    if (!verifyOTP(email, type, code)) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }
}
