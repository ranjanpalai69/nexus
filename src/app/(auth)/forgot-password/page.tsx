'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

const schema = z.object({ email: z.string().email() })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      toast.success('Reset code sent if your email is registered')
      router.push(`/reset-password?email=${encodeURIComponent(data.email)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reset password</h2>
        <p className="text-muted-foreground mt-1 text-sm">Enter your email to receive a reset code</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input {...register('email')} type="email" placeholder="Email address"
          leftIcon={<FontAwesomeIcon icon={faEnvelope} className="h-4 w-4" />}
          error={errors.email?.message} />
        <Button type="submit" variant="gradient" className="w-full" loading={loading}>
          Send Reset Code
        </Button>
      </form>
      <Link href="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
        Back to login
      </Link>
    </div>
  )
}
