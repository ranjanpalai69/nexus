'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface OTPVerificationProps {
  email: string
  type: 'email_verification' | 'password_reset'
  onSuccess?: (code: string) => void
}

export function OTPVerification({ email, type, onSuccess }: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[index] = val.slice(-1)
    setOtp(next)
    if (val && index < 5) inputs.current[index + 1]?.focus()
    if (next.every((d) => d) && next.join('').length === 6) {
      handleVerify(next.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (paste.length) {
      const next = [...otp]
      paste.split('').forEach((c, i) => { next[i] = c })
      setOtp(next)
      inputs.current[Math.min(paste.length, 5)]?.focus()
      if (paste.length === 6) handleVerify(paste)
    }
  }

  const handleVerify = async (code: string) => {
    setLoading(true)
    try {
      const endpoint = type === 'email_verification' ? '/api/auth/verify-email' : '/api/auth/reset-password'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); setOtp(['', '', '', '', '', '']); inputs.current[0]?.focus(); return }

      if (onSuccess) {
        onSuccess(code)
      } else {
        toast.success(type === 'email_verification' ? 'Email verified! Welcome to Nexus 🎉' : 'Code verified!')
        router.push(type === 'email_verification' ? '/login' : `/reset-password?email=${encodeURIComponent(email)}&code=${code}`)
      }
    } catch {
      toast.error('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const resendCode = async () => {
    setResending(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      toast.success('New code sent to your email')
    } catch {
      toast.error('Failed to resend')
    } finally {
      setResending(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center">
      <p className="text-sm text-muted-foreground">
        We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>
      </p>

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-14 w-12 rounded-xl border-2 border-border bg-background text-center text-xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        ))}
      </div>

      <Button
        variant="gradient"
        className="w-full"
        loading={loading}
        onClick={() => handleVerify(otp.join(''))}
        disabled={otp.some((d) => !d)}
      >
        Verify Code
      </Button>

      <p className="text-sm text-muted-foreground">
        Didn&apos;t receive it?{' '}
        <button onClick={resendCode} disabled={resending} className="text-primary font-semibold hover:underline disabled:opacity-50">
          {resending ? 'Sending...' : 'Resend code'}
        </button>
      </p>
    </motion.div>
  )
}
