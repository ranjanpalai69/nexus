import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/shared/Logo'
import { AuthBackground } from '@/components/auth/AuthBackground'
import { ShieldCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Auth' }

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex bg-background">
      <AuthBackground />

      {/* ── Left branding panel (desktop only) ─────────────────────────── */}
      <aside className="hidden lg:flex lg:w-[44%] xl:w-[46%] flex-col justify-between p-10 xl:p-14 relative z-10 shrink-0 border-r border-border/30">

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.05] via-transparent to-cyan-500/[0.04] pointer-events-none" />

        {/* Logo */}
        <Link href="/" className="inline-block w-fit relative z-10">
          <Logo size="lg" />
        </Link>

        {/* Centre content — minimal */}
        <div className="space-y-6 relative z-10">
          {/* Animated live dot */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inset-0 rounded-full bg-primary/60 opacity-75" />
              <span className="relative rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
              Now live
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight text-foreground">
              Connect with{' '}
              <span className="text-gradient">the world</span>
              {' '}around you.
            </h1>
            <p className="text-sm xl:text-base text-muted-foreground leading-relaxed max-w-xs">
              Share moments, build communities, and stay connected with the people who matter most.
            </p>
          </div>

          {/* Minimal stats row */}
          <div className="flex items-center gap-6 pt-2">
            {[
              { value: '50K+', label: 'Members' },
              { value: '99.9%', label: 'Uptime' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom security note */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50 relative z-10">
          <ShieldCheck className="h-3 w-3" />
          End-to-end encrypted
        </div>
      </aside>

      {/* ── Right form panel ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-10 xl:p-14 relative z-10 min-h-screen">

        {/* Mobile logo */}
        <Link href="/" className="lg:hidden mb-8 inline-block">
          <Logo size="lg" />
        </Link>

        {/* Card */}
        <div className="w-full max-w-[440px] xl:max-w-[460px]">
          <div className="relative bg-card/80 dark:bg-card/50 backdrop-blur-2xl border border-border/50 rounded-2xl p-7 sm:p-8 xl:p-9 shadow-2xl shadow-black/5 dark:shadow-black/40">
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-t-2xl" />
            {/* Corner glow */}
            <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-bl from-primary/[0.06] to-transparent rounded-tr-2xl pointer-events-none" />

            <div className="relative">
              {children}
            </div>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-muted-foreground/40">
            <ShieldCheck className="h-3 w-3" />
            Secured with end-to-end encryption
          </div>
        </div>
      </div>
    </div>
  )
}
