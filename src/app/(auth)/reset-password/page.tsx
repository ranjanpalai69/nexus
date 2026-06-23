'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { OTPVerification } from '@/components/auth/OTPVerification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

const schema = z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type FormData = z.infer<typeof schema>

function ResetPasswordContent() {
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const prefillCode = params.get('code') ?? ''
  const [verifiedCode, setVerifiedCode] = useState(prefillCode)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    if (!verifiedCode) { toast.error('Please verify your code first'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verifiedCode, password: data.password }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return }
      toast.success('Password reset successfully!')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (!verifiedCode) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Enter reset code</h2>
          <p className="text-muted-foreground mt-1 text-sm">Check your email for the 6-digit code</p>
        </div>
        <OTPVerification
          email={email}
          type="password_reset"
          onSuccess={(code) => setVerifiedCode(code)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Set new password</h2>
        <p className="text-muted-foreground mt-1 text-sm">Choose a strong password for your account</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="New password"
          leftIcon={<FontAwesomeIcon icon={faLock} className="h-4 w-4" />}
          rightIcon={<button type="button" onClick={() => setShowPass(!showPass)}><FontAwesomeIcon icon={showPass ? faEyeSlash : faEye} className="h-4 w-4" /></button>}
          error={errors.password?.message} />
        <Input {...register('confirm')} type={showPass ? 'text' : 'password'} placeholder="Confirm password"
          leftIcon={<FontAwesomeIcon icon={faLock} className="h-4 w-4" />}
          error={errors.confirm?.message} />
        <Button type="submit" variant="gradient" className="w-full" loading={loading}>
          Reset Password
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}
