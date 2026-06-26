import nodemailer from 'nodemailer'

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  })
}

function getFrom() {
  return `Nexus <${process.env.GMAIL_USER}>`
}

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin: 0; padding: 0; background: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .container { max-width: 560px; margin: 40px auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #FF5C00 0%, #E91E8C 35%, #9333EA 65%, #06B6D4 100%); padding: 32px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  .body { padding: 32px; color: #e2e8f0; }
  .body p { line-height: 1.6; margin: 0 0 16px; }
  .code-box { background: #0f0f0f; border: 2px solid #9333EA; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
  .code { font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #c084fc; font-family: monospace; }
  .btn { display: inline-block; background: linear-gradient(135deg, #E91E8C, #9333EA, #06B6D4); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; margin: 16px 0; }
  .footer { padding: 24px 32px; border-top: 1px solid #2a2a4a; color: #64748b; font-size: 12px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Nexus</h1></div>
    <div class="body">${content}</div>
    <div class="footer"><p>© ${new Date().getFullYear()} Nexus. This email was sent to you because you signed up.</p></div>
  </div>
</body>
</html>`
}

export async function sendVerificationEmail(email: string, code: string, name?: string) {
  const content = `
    <p>Hey ${name || 'there'} 👋</p>
    <p>Welcome to <strong>Nexus</strong>! Use the code below to verify your email address. It expires in <strong>15 minutes</strong>.</p>
    <div class="code-box">
      <div class="code">${code}</div>
    </div>
    <p style="color:#64748b;font-size:13px">If you didn't sign up for Nexus, you can safely ignore this email.</p>
  `
  await getTransporter().sendMail({
    from: getFrom(),
    to: email,
    subject: 'Verify your Nexus account',
    html: baseTemplate(content),
  })
}

export async function sendPasswordResetEmail(email: string, code: string) {
  const content = `
    <p>You requested a password reset. Use the code below — it&apos;s valid for <strong>15 minutes</strong>.</p>
    <div class="code-box">
      <div class="code">${code}</div>
    </div>
    <p style="color:#64748b;font-size:13px">Didn't request this? Your account is safe — just ignore this email.</p>
  `
  await getTransporter().sendMail({
    from: getFrom(),
    to: email,
    subject: 'Reset your Nexus password',
    html: baseTemplate(content),
  })
}

export async function sendWelcomeEmail(email: string, name: string) {
  const content = `
    <p>Hi ${name} 🎉</p>
    <p>Your account is verified and ready to go. Welcome to <strong>Nexus</strong> — your new space to connect, share, and discover.</p>
    <div style="text-align:center">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/feed" class="btn">Open Nexus →</a>
    </div>
  `
  await getTransporter().sendMail({
    from: getFrom(),
    to: email,
    subject: 'Welcome to Nexus! 🚀',
    html: baseTemplate(content),
  })
}
