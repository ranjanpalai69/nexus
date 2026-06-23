'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

const schema = z.object({ email: z.string().email('Invalid email address') })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/api/auth/callback?type=recovery`,
      })
      // Don't reveal if email exists — always show success
      if (error) console.error('[forgot-password]', error)
      setSentEmail(data.email)
      setDone(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="flex justify-center"
        >
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center">
            <CheckCircle className="h-9 w-9 text-primary" />
          </div>
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Check your inbox</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If <span className="text-foreground font-medium">{sentEmail}</span> is registered,
            you&apos;ll receive a password reset link shortly.
          </p>
        </div>
        <div className="text-left space-y-2 bg-muted/40 rounded-xl p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Didn&apos;t get it?</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Check your spam / junk folder</li>
            <li>The link expires in 1 hour</li>
          </ul>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Reset password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <div className={cn(
            'relative flex items-center h-11 rounded-xl border bg-background/50 px-3 transition-all duration-200',
            'focus-within:ring-2 focus-within:ring-ring focus-within:border-primary/50',
            errors.email ? 'border-destructive/60' : 'border-border/60 hover:border-border'
          )}>
            <Mail className="absolute left-3 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-transparent pl-10 pr-4 py-0 text-sm placeholder:text-muted-foreground/60 outline-none"
            />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-destructive px-1">
                {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={cn(
            'w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold',
            'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600',
            'text-white shadow-lg shadow-indigo-500/25 transition-all duration-200',
            'disabled:opacity-60 disabled:pointer-events-none'
          )}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Send Reset Link</span><ArrowRight className="h-4 w-4" /></>}
        </motion.button>
      </form>

      <Link
        href="/login"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to login
      </Link>
    </motion.div>
  )
}
