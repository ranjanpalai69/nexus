'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User, AtSign, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

const schema = z.object({
  fullName: z.string().min(1, 'Name required').max(100),
  username: z.string().min(3, 'Min 3 chars').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export function SignupForm() {
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      // 1. Check username + email availability
      const check = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.username, email: data.email }),
      })
      const checkResult = await check.json()
      if (!check.ok) { toast.error(checkResult.error); return }

      // 2. Sign up via Supabase — triggers free built-in confirmation email
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { username: data.username, full_name: data.fullName },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) { toast.error(error.message); return }

      toast.success('Check your email and click the confirmation link!')
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch {
      toast.error('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
    } catch {
      toast.error('Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full space-y-5"
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Create account</h2>
        <p className="text-sm text-muted-foreground">Join Nexus — it&apos;s free</p>
      </div>

      <motion.button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          'w-full flex items-center justify-center gap-3 h-11 px-4 rounded-xl text-sm font-semibold',
          'border border-border bg-background/50 hover:bg-accent transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:opacity-60 disabled:pointer-events-none'
        )}
      >
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </motion.button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card/70 backdrop-blur-sm px-3 text-xs text-muted-foreground font-medium">
            or sign up with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <FieldInput label="Full Name" icon={<User className="h-4 w-4" />} error={errors.fullName?.message}>
          <input
            {...register('fullName')}
            placeholder="Your full name"
            autoComplete="name"
            className="w-full bg-transparent pl-10 pr-4 py-0 text-sm placeholder:text-muted-foreground/60 outline-none"
          />
        </FieldInput>

        <FieldInput label="Username" icon={<AtSign className="h-4 w-4" />} error={errors.username?.message}>
          <input
            {...register('username')}
            placeholder="your_username"
            autoComplete="username"
            className="w-full bg-transparent pl-10 pr-4 py-0 text-sm placeholder:text-muted-foreground/60 outline-none"
          />
        </FieldInput>

        <FieldInput label="Email" icon={<Mail className="h-4 w-4" />} error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full bg-transparent pl-10 pr-4 py-0 text-sm placeholder:text-muted-foreground/60 outline-none"
          />
        </FieldInput>

        <FieldInput
          label="Password"
          icon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          suffix={
            <button type="button" onClick={() => setShowPass(!showPass)} className="text-muted-foreground/60 hover:text-foreground transition-colors" tabIndex={-1}>
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        >
          <input
            {...register('password')}
            type={showPass ? 'text' : 'password'}
            placeholder="Min 8 characters"
            autoComplete="new-password"
            className="w-full bg-transparent pl-10 pr-10 py-0 text-sm placeholder:text-muted-foreground/60 outline-none"
          />
        </FieldInput>

        <FieldInput label="Confirm Password" icon={<Lock className="h-4 w-4" />} error={errors.confirmPassword?.message}>
          <input
            {...register('confirmPassword')}
            type={showPass ? 'text' : 'password'}
            placeholder="Repeat password"
            autoComplete="new-password"
            className="w-full bg-transparent pl-10 pr-4 py-0 text-sm placeholder:text-muted-foreground/60 outline-none"
          />
        </FieldInput>

        <p className="text-xs text-muted-foreground">
          By signing up you agree to our{' '}
          <span className="text-primary cursor-pointer hover:underline">Terms</span> and{' '}
          <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
        </p>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={cn(
            'w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold',
            'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600',
            'text-white shadow-lg shadow-indigo-500/25 transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:opacity-60 disabled:pointer-events-none'
          )}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>}
        </motion.button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">Sign in</Link>
      </p>
    </motion.div>
  )
}

function FieldInput({ label, icon, error, suffix, children }: {
  label: string; icon: React.ReactNode; error?: string; suffix?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
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

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
