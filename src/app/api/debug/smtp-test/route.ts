export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// DELETE THIS ROUTE AFTER TESTING
export async function GET() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    return NextResponse.json({ ok: false, error: 'GMAIL_USER or GMAIL_APP_PASSWORD env var not set' })
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  })

  try {
    await transporter.verify()
    return NextResponse.json({ ok: true, message: `SMTP port 465 connected successfully as ${user}` })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg })
  }
}
