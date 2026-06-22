import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = { title: 'Create Account' }

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Create your account</h2>
        <p className="text-muted-foreground mt-1">Join millions on Nexus today</p>
      </div>
      <SignupForm />
    </div>
  )
}
