'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export function LoginForm() {
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
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email first')
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
          return
        }
        toast.error(error.message)
        return
      }
      router.push('/feed')
    } catch {
      toast.error('Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      })
    } catch {
      toast.error('Google sign-in failed')
      setGoogleLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
      <Button
        variant="outline"
        className="w-full gap-3 h-11"
        onClick={handleGoogle}
        loading={googleLoading}
        type="button"
      >
        <FontAwesomeIcon icon={faGoogle} className="h-4 w-4 text-red-500" />
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground font-medium">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          {...register('email')}
          type="email"
          placeholder="Email address"
          autoComplete="email"
          leftIcon={<FontAwesomeIcon icon={faEnvelope} className="h-4 w-4" />}
          error={errors.email?.message}
        />
        <Input
          {...register('password')}
          type={showPass ? 'text' : 'password'}
          placeholder="Password"
          autoComplete="current-password"
          leftIcon={<FontAwesomeIcon icon={faLock} className="h-4 w-4" />}
          rightIcon={
            <button type="button" onClick={() => setShowPass(!showPass)}>
              <FontAwesomeIcon icon={showPass ? faEyeSlash : faEye} className="h-4 w-4" />
            </button>
          }
          error={errors.password?.message}
        />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" variant="gradient" loading={loading}>
          Sign In
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          Sign up
        </Link>
      </p>
    </motion.div>
  )
}
