import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,           // SSL — more reliable than STARTTLS (587) on cloud hosts
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
}

function from() {
  return `Nexus <${process.env.GMAIL_USER}>`
}

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; background:#0f0f0f; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  .wrap { max-width:560px; margin:40px auto; background:#1a1a2e; border-radius:16px; overflow:hidden; }
  .hdr  { background:linear-gradient(135deg,#FF5C00 0%,#E91E8C 35%,#9333EA 65%,#06B6D4 100%); padding:28px 32px; }
  .hdr h1 { color:#fff; margin:0; font-size:22px; font-weight:900; letter-spacing:4px; }
  .body { padding:32px; color:#e2e8f0; }
  .body p { line-height:1.6; margin:0 0 16px; }
  .box  { background:#0f0f0f; border:2px solid #9333EA; border-radius:12px; padding:24px; text-align:center; margin:24px 0; }
  .code { font-size:36px; font-weight:700; letter-spacing:12px; color:#c084fc; font-family:monospace; }
  .btn  { display:inline-block; background:linear-gradient(135deg,#E91E8C,#9333EA,#06B6D4); color:#fff; text-decoration:none; padding:14px 32px; border-radius:50px; font-weight:600; font-size:15px; margin:16px 0; }
  .foot { padding:20px 32px; border-top:1px solid #2a2a4a; color:#64748b; font-size:12px; }
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

export async function sendVerificationEmail(email: string, code: string, name?: string) {
  const content = `
    <p>Hey ${name || 'there'},</p>
    <p>Use the code below to verify your <strong>Nexus</strong> account. It expires in <strong>15 minutes</strong>.</p>
    <div class="box"><div class="code">${code}</div></div>
    <p style="color:#64748b;font-size:13px">If you didn't sign up for Nexus, ignore this email.</p>
  `
  await createTransport().sendMail({ from: from(), to: email, subject: 'Verify your Nexus account', html: baseTemplate(content) })
}

export async function sendPasswordResetEmail(email: string, code: string) {
  const content = `
    <p>You requested a password reset for your Nexus account.</p>
    <p>Use the code below — valid for <strong>15 minutes</strong>.</p>
    <div class="box"><div class="code">${code}</div></div>
    <p style="color:#64748b;font-size:13px">Didn't request this? Your account is safe — just ignore this email.</p>
  `
  await createTransport().sendMail({ from: from(), to: email, subject: 'Reset your Nexus password', html: baseTemplate(content) })
}

export async function sendWelcomeEmail(email: string, name: string) {
  const content = `
    <p>Hi ${name},</p>
    <p>Your email is verified and your <strong>Nexus</strong> account is ready. Welcome!</p>
    <div style="text-align:center;margin-top:24px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/feed" class="btn">Open Nexus</a>
    </div>
  `
  await createTransport().sendMail({ from: from(), to: email, subject: 'Welcome to Nexus!', html: baseTemplate(content) })
}
