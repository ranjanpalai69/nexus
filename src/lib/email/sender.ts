import { Resend } from 'resend'
import nodemailer from 'nodemailer'

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  .wrap{max-width:560px;margin:40px auto;background:#1a1a2e;border-radius:16px;overflow:hidden}
  .hdr{background:linear-gradient(135deg,#FF5C00 0%,#E91E8C 35%,#9333EA 65%,#06B6D4 100%);padding:28px 32px}
  .hdr h1{color:#fff;margin:0;font-size:22px;font-weight:900;letter-spacing:4px}
  .body{padding:32px;color:#e2e8f0}
  .body p{line-height:1.6;margin:0 0 16px}
  .box{background:#0f0f0f;border:2px solid #9333EA;border-radius:12px;padding:24px;text-align:center;margin:24px 0}
  .code{font-size:36px;font-weight:700;letter-spacing:12px;color:#c084fc;font-family:monospace}
  .btn{display:inline-block;background:linear-gradient(135deg,#E91E8C,#9333EA,#06B6D4);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:600;font-size:15px;margin:16px 0}
  .foot{padding:20px 32px;border-top:1px solid #2a2a4a;color:#64748b;font-size:12px}
</style>
</head>
<body>
  <div class="wrap">
    <div class="hdr"><h1>NEXUS</h1></div>
    <div class="body">${content}</div>
    <div class="foot"><p>© ${new Date().getFullYear()} Nexus. You received this because you signed up.</p></div>
  </div>
</body>
</html>`
}

/**
 * Deliver email via Resend (HTTP API — works from any cloud host) when
 * RESEND_API_KEY is set, else fall back to Gmail SMTP (works locally).
 *
 * Gmail SMTP is blocked by Google on most cloud hosting IPs, which is
 * why Resend is used for production deployments on Render / Railway / etc.
 */
async function deliver(to: string, subject: string, html: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY

  // ── Primary: Resend HTTP API ────────────────────────────────────────────
  if (resendKey) {
    const resend = new Resend(resendKey)
    const { error } = await resend.emails.send({
      from: 'Nexus <onboarding@resend.dev>',
      to:   [to],
      subject,
      html,
    })
    if (error) throw new Error(`Resend: ${error.message}`)
    console.log(`[email] sent via Resend → ${to}`)
    return
  }

  // ── Fallback: Gmail SMTP (for local dev) ───────────────────────────────
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    throw new Error('No email provider configured. Set RESEND_API_KEY (production) or GMAIL_USER + GMAIL_APP_PASSWORD (local dev).')
  }

  const configs = [
    { port: 465 as const, secure: true  as const, label: 'SSL-465'     },
    { port: 587 as const, secure: false as const, label: 'STARTTLS-587' },
  ]
  let lastErr = new Error('SMTP failed')
  for (const { port, secure, label } of configs) {
    try {
      const t = nodemailer.createTransport({
        host: 'smtp.gmail.com', port, secure,
        auth: { user, pass },
        connectionTimeout: 12_000, greetingTimeout: 8_000, socketTimeout: 12_000,
      })
      await t.sendMail({ from: `Nexus <${user}>`, to, subject, html })
      console.log(`[email] sent via SMTP ${label} → ${to}`)
      return
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      console.error(`[email] SMTP ${label} failed: ${lastErr.message}`)
    }
  }
  throw lastErr
}

export async function sendVerificationEmail(email: string, code: string, name?: string) {
  await deliver(email, 'Verify your Nexus account', baseTemplate(`
    <p>Hey ${name || 'there'},</p>
    <p>Use the code below to verify your <strong>Nexus</strong> account. Valid for <strong>15 minutes</strong>.</p>
    <div class="box"><div class="code">${code}</div></div>
    <p style="color:#64748b;font-size:13px">Didn't sign up? Ignore this email.</p>
  `))
}

export async function sendPasswordResetEmail(email: string, code: string) {
  await deliver(email, 'Reset your Nexus password', baseTemplate(`
    <p>You requested a password reset for your Nexus account.</p>
    <p>Use this code — valid for <strong>15 minutes</strong>.</p>
    <div class="box"><div class="code">${code}</div></div>
    <p style="color:#64748b;font-size:13px">Didn't request this? Ignore this email.</p>
  `))
}

export async function sendWelcomeEmail(email: string, name: string) {
  await deliver(email, 'Welcome to Nexus!', baseTemplate(`
    <p>Hi ${name},</p>
    <p>Your account is verified and ready. Welcome to <strong>Nexus</strong>!</p>
    <div style="text-align:center;margin-top:24px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/feed" class="btn">Open Nexus</a>
    </div>
  `))
}
