'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, RefreshCw, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils/cn'
import { OtpInput } from '@/components/ui/otp-input'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') ?? ''
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [done, setDone] = useState(false)
  const [otpComplete, setOtpComplete] = useState(false)
  const otpRef = useRef('')
  const autoFired = useRef(false)
  const supabase = createClient()

  const handleVerify = async (code?: string) => {
    const otp = code ?? otpRef.current
    if (!otp || otp.length !== 6) return
    if (loading || done) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || 'Invalid code. Please try again.')
        autoFired.current = false // allow retry
        return
      }

      setDone(true)

      try {
        const stored = sessionStorage.getItem('nexus_pending_signup')
        if (stored) {
          const { email: storedEmail, password } = JSON.parse(stored)
          sessionStorage.removeItem('nexus_pending_signup')
          const { error } = await supabase.auth.signInWithPassword({ email: storedEmail, password })
          if (!error) {
            toast.success('Welcome to Nexus!')
            router.push('/feed')
            return
          }
        }
      } catch { /* sessionStorage unavailable */ }

      toast.success('Email verified! Please sign in.')
      router.push('/login')
    } catch {
      toast.error('Verification failed. Please try again.')
      autoFired.current = false
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (!otpComplete) {
      autoFired.current = false
      return
    }
    if (done || autoFired.current) return
    autoFired.current = true
    handleVerify()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpComplete])

  const handleResend = async () => {
    if (!email || resending) return
    setResending(true)
    autoFired.current = false
    try {
      await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'email_verification' }),
      })
      toast.success('New code sent! Check your inbox.')
    } catch {
      toast.error('Failed to resend. Please try again.')
    } finally {
      setResending(false)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 text-center"
      >
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-9 w-9 text-green-500" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Email verified!</h2>
          <p className="text-sm text-muted-foreground mt-1">Signing you in...</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div className="flex justify-center">
        <div className="h-20 w-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-purple-500/20">
          <Mail className="h-9 w-9 text-primary" />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Verify your email</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a 6-digit code to{' '}
          {email && <span className="text-foreground font-medium">{email}</span>}
        </p>
      </div>

      <OtpInput
        onChange={code => {
          otpRef.current = code
          setOtpComplete(/^\d{6}$/.test(code))
        }}
        disabled={loading}
      />

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verifying...
        </div>
      )}

      {!loading && (
        <button
          type="button"
          onClick={() => handleVerify()}
          disabled={!otpComplete}
          className={cn(
            'w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold',
            'nexus-gradient hover:opacity-90 text-white shadow-lg shadow-purple-500/25',
            'transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none'
          )}
        >
          Verify Email
        </button>
      )}

      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">Didn&apos;t receive the code?</p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="flex items-center gap-1.5 mx-auto text-sm text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', resending && 'animate-spin')} />
          {resending ? 'Sending...' : 'Resend code'}
        </button>
      </div>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to login
      </Link>
    </motion.div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  )
}
