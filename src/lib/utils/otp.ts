import crypto from 'crypto'

// Derive a secret from an already-present env var so no new env var is needed.
// OTP_SECRET overrides it if set.
function secret() {
  return (
    process.env.OTP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-32) ||
    'nexus-otp-default'
  )
}

// 15-minute time bucket
function bucket(offsetMs = 0) {
  return Math.floor((Date.now() + offsetMs) / (15 * 60 * 1000))
}

/** Generate a deterministic 6-digit code for email + type + current time window */
export function generateOTP(email: string, type: string): string {
  const b = bucket()
  const hmac = crypto.createHmac('sha256', secret())
  hmac.update(`${email.toLowerCase()}:${type}:${b}`)
  const num = parseInt(hmac.digest('hex').slice(0, 8), 16) % 1_000_000
  return num.toString().padStart(6, '0')
}

/**
 * Verify a code against the current bucket and the previous one
 * (so a code sent at 14:59 is still valid at 15:01).
 */
export function verifyOTP(email: string, type: string, code: string): boolean {
  const trimmed = code.trim()
  for (const offsetMs of [0, -(15 * 60 * 1000)]) {
    const b = bucket(offsetMs)
    const hmac = crypto.createHmac('sha256', secret())
    hmac.update(`${email.toLowerCase()}:${type}:${b}`)
    const expected = (parseInt(hmac.digest('hex').slice(0, 8), 16) % 1_000_000)
      .toString()
      .padStart(6, '0')
    if (expected === trimmed) return true
  }
  return false
}
