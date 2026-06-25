'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils/cn'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [resending, setResending] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (error) { toast.error(error.message); return }
      setSent(true)
      toast.success('Confirmation email resent!')
    } catch {
      toast.error('Failed to resend. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6 text-center"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="flex justify-center"
      >
        <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-purple-500/20">
          <Mail className="h-9 w-9 text-primary" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">✓</span>
          </span>
        </div>
      </motion.div>

      {/* Text */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Check your email</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a confirmation link to{' '}
          {email && <span className="text-foreground font-medium">{email}</span>}.
          <br />
          Click the link to activate your account.
        </p>
      </div>

      {/* Instructions */}
      <div className="text-left space-y-2 bg-muted/40 rounded-xl p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Didn&apos;t get it?</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Check your spam / junk folder</li>
          <li>Wait a minute and check again</li>
        </ul>
      </div>

      {/* Resend */}
      <button
        type="button"
        onClick={handleResend}
        disabled={resending || sent || !email}
        className={cn(
          'w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold',
          'border border-border bg-background/50 hover:bg-accent transition-all duration-200',
          'disabled:opacity-50 disabled:pointer-events-none'
        )}
      >
        <RefreshCw className={cn('h-4 w-4', resending && 'animate-spin')} />
        {sent ? 'Email resent!' : resending ? 'Sending...' : 'Resend confirmation email'}
      </button>

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
