'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { OTPVerification } from '@/components/auth/OTPVerification'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelopeCircleCheck } from '@fortawesome/free-solid-svg-icons'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <FontAwesomeIcon icon={faEnvelopeCircleCheck} className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="text-muted-foreground mt-1 text-sm">Enter the verification code we sent you</p>
      </div>
      <OTPVerification email={email} type="email_verification" />
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  )
}
