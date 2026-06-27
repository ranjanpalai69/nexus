import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/shared/Logo'
import { AuthBackground } from '@/components/auth/AuthBackground'
import { AuthBranding } from '@/components/auth/AuthBranding'
import { ShieldCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Nexus' }

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex bg-background">
      <AuthBackground />

      {/* ── Left branding panel (lg+) ───────────────────────────────── */}
      <aside className="hidden lg:flex lg:w-[46%] xl:w-[48%] flex-col justify-between p-10 xl:p-14 relative z-10 shrink-0 border-r border-white/[0.06]">

        {/* Subtle gradient tint */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.06] via-transparent to-cyan-500/[0.04] pointer-events-none" />

        {/* Logo */}
        <Link href="/" className="relative z-10 w-fit block">
          <Logo size="lg" />
        </Link>

        {/* Animated branding content */}
        <div className="relative z-10">
          <AuthBranding />
        </div>

        {/* Security note */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/40 relative z-10">
          <ShieldCheck className="h-3 w-3 shrink-0" />
          <span>End-to-end encrypted</span>
        </div>
      </aside>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-5 sm:p-8 lg:p-10 xl:p-14 relative z-10 min-h-screen">

        {/* Mobile logo */}
        <Link href="/" className="lg:hidden mb-8 block w-fit">
          <Logo size="lg" />
        </Link>

        {/* Form card */}
        <div className="w-full max-w-[440px] xl:max-w-[460px]">
          <div className="relative bg-card/80 dark:bg-card/50 backdrop-blur-2xl border border-border/50 rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/5 dark:shadow-black/50">
            {/* Top gradient line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-t-2xl" />
            {/* Corner glow */}
            <div className="absolute top-0 right-0 h-48 w-48 bg-gradient-to-bl from-primary/[0.07] to-transparent rounded-tr-2xl pointer-events-none" />
            <div className="relative">{children}</div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-muted-foreground/40">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span>Secured with end-to-end encryption</span>
          </div>
        </div>
      </div>
    </div>
  )
}
