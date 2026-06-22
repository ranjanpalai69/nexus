'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock, faUser, faEye, faEyeSlash, faAt } from '@fortawesome/free-solid-svg-icons'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const schema = z.object({
  fullName: z.string().min(1, 'Name required').max(100),
  username: z.string().min(3, 'Min 3 chars').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores'),
  email: z.string().email('Invalid email'),
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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          username: data.username,
          fullName: data.fullName,
        }),
      })
      const result = await res.json()
      if (!res.ok) { toast.error(result.error); return }
      toast.success('Check your email for a verification code!')
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch {
      toast.error('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
      <Button variant="outline" className="w-full gap-3 h-11" onClick={handleGoogle} loading={googleLoading} type="button">
        <FontAwesomeIcon icon={faGoogle} className="h-4 w-4 text-red-500" />
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground font-medium">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Input {...register('fullName')} placeholder="Full name" autoComplete="name"
          leftIcon={<FontAwesomeIcon icon={faUser} className="h-4 w-4" />}
          error={errors.fullName?.message} />
        <Input {...register('username')} placeholder="Username" autoComplete="username"
          leftIcon={<FontAwesomeIcon icon={faAt} className="h-4 w-4" />}
          error={errors.username?.message} />
        <Input {...register('email')} type="email" placeholder="Email address" autoComplete="email"
          leftIcon={<FontAwesomeIcon icon={faEnvelope} className="h-4 w-4" />}
          error={errors.email?.message} />
        <Input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="Password" autoComplete="new-password"
          leftIcon={<FontAwesomeIcon icon={faLock} className="h-4 w-4" />}
          rightIcon={
            <button type="button" onClick={() => setShowPass(!showPass)}>
              <FontAwesomeIcon icon={showPass ? faEyeSlash : faEye} className="h-4 w-4" />
            </button>
          }
          error={errors.password?.message} />
        <Input {...register('confirmPassword')} type={showPass ? 'text' : 'password'} placeholder="Confirm password" autoComplete="new-password"
          leftIcon={<FontAwesomeIcon icon={faLock} className="h-4 w-4" />}
          error={errors.confirmPassword?.message} />

        <p className="text-xs text-muted-foreground">
          By signing up you agree to our <span className="text-primary">Terms</span> and <span className="text-primary">Privacy Policy</span>.
        </p>

        <Button type="submit" className="w-full" variant="gradient" loading={loading}>
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
      </p>
    </motion.div>
  )
}
