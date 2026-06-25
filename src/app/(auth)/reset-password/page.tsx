'use client'
import { Suspense, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Lock, Eye, EyeOff, ArrowRight, Loader2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { OtpInput } from '@/components/ui/otp-input'

const schema = z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})
type FormData = z.infer<typeof schema>

function FieldInput({ icon, error, suffix, children }: {
  icon: React.ReactNode; error?: string; suffix?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className={cn(
        'relative flex items-center h-11 rounded-xl border bg-background/50 px-3 transition-all duration-200',
        'focus-within:ring-2 focus-within:ring-ring focus-within:border-primary/50',
        error ? 'border-destructive/60' : 'border-border/60 hover:border-border'
      )}>
        <span className="absolute left-3 text-muted-foreground/60 pointer-events-none">{icon}</span>
        {children}
        {suffix && <span className="absolute right-3">{suffix}</span>}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-destructive px-1">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') ?? ''
  const [step, setStep] = useState<'otp' | 'password'>('otp')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpComplete, setOtpComplete] = useState(false)
  const otpRef = useRef('')
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  if (!email) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">Invalid reset link.</p>
        <Link href="/forgot-password" className="text-primary font-medium hover:underline text-sm">
          Request a password reset
        </Link>
      </div>
    )
  }

  const handleOtpContinue = () => {
    if (!otpComplete) {
      toast.error('Please enter the complete 6-digit code')
      return
    }
    setStep('password')
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpRef.current, password: data.password }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || 'Failed to reset password')
        if (result.error?.includes('Invalid') || result.error?.includes('expired')) {
          // Go back to OTP step so user can request a new code
          setStep('otp')
          otpRef.current = ''
          setOtpComplete(false)
        }
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      })
      if (signInError) {
        toast.success('Password reset! Please sign in.')
        router.push('/login')
        return
      }
      toast.success('Password reset successfully!')
      router.push('/feed')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <motion.div
        key="otp"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="space-y-6"
      >
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Enter reset code</h2>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to{' '}
            <span className="text-foreground font-medium">{email}</span>
          </p>
        </div>

        <OtpInput
          onChange={code => {
            otpRef.current = code
            setOtpComplete(/^\d{6}$/.test(code))
          }}
          disabled={loading}
        />

        <motion.button
          type="button"
          onClick={handleOtpContinue}
          disabled={!otpComplete}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={cn(
            'w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold',
            'nexus-gradient hover:opacity-90 text-white shadow-lg shadow-purple-500/25',
            'transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none'
          )}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </motion.button>

        <Link
          href="/forgot-password"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Resend code
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      key="password"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Set new password</h2>
        <p className="text-sm text-muted-foreground">Choose a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FieldInput
          icon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          suffix={
            <button type="button" onClick={() => setShowPass(p => !p)} className="text-muted-foreground/60 hover:text-foreground transition-colors" tabIndex={-1}>
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        >
          <input
            {...register('password')}
            type={showPass ? 'text' : 'password'}
            placeholder="New password (min 8 chars)"
            autoComplete="new-password"
            className="w-full bg-transparent pl-10 pr-10 py-0 text-sm placeholder:text-muted-foreground/60 outline-none"
          />
        </FieldInput>

        <FieldInput icon={<Lock className="h-4 w-4" />} error={errors.confirm?.message}>
          <input
            {...register('confirm')}
            type={showPass ? 'text' : 'password'}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full bg-transparent pl-10 pr-4 py-0 text-sm placeholder:text-muted-foreground/60 outline-none"
          />
        </FieldInput>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={cn(
            'w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold',
            'nexus-gradient hover:opacity-90 text-white shadow-lg shadow-purple-500/25',
            'transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none'
          )}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Reset Password</span><ArrowRight className="h-4 w-4" /></>}
        </motion.button>
      </form>

      <button
        type="button"
        onClick={() => setStep('otp')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Change code
      </button>
    </motion.div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}
