import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/shared/Logo'
import { AuthBackground } from '@/components/auth/AuthBackground'
import { ShieldCheck, Zap, Globe, Lock } from 'lucide-react'

export const metadata: Metadata = { title: 'Auth' }

const features = [
  {
    icon: Zap,
    color: 'from-orange-500/20 to-pink-500/20 border-orange-500/20',
    iconColor: 'text-orange-400',
    title: 'Real-time everything',
    text: 'Instant messages, live feeds, and real-time notifications',
  },
  {
    icon: Globe,
    color: 'from-purple-500/20 to-cyan-500/20 border-purple-500/20',
    iconColor: 'text-purple-400',
    title: 'Global community',
    text: 'Connect with people across the world in seconds',
  },
  {
    icon: Lock,
    color: 'from-pink-500/20 to-purple-600/20 border-pink-500/20',
    iconColor: 'text-pink-400',
    title: 'Privacy-first design',
    text: 'End-to-end encryption and security-always architecture',
  },
]

const stats = [
  { value: '50K+', label: 'Members' },
  { value: '2M+', label: 'Posts' },
  { value: '99.9%', label: 'Uptime' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex bg-background">
      <AuthBackground />

      {/* ── Left branding panel (desktop only) ─────────────────────────────── */}
      <aside className="hidden lg:flex lg:w-[46%] xl:w-[48%] flex-col justify-between p-10 xl:p-14 2xl:p-16 relative z-10 shrink-0">

        {/* Subtle left-panel tint */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.04] via-transparent to-cyan-500/[0.03] pointer-events-none" />

        {/* Logo */}
        <Link href="/" className="inline-block w-fit relative">
          <Logo size="lg" />
        </Link>

        {/* Hero */}
        <div className="space-y-8 relative">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-wider w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inset-0 rounded-full bg-pink-400 opacity-75" />
              <span className="relative rounded-full h-2 w-2 bg-purple-500" />
            </span>
            Now live · Join thousands
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-[50px] 2xl:text-[58px] font-bold leading-[1.1] tracking-tight text-foreground">
              Connect with{' '}
              <span className="text-gradient">the world</span>
              <br className="hidden xl:block" />
              {' '}around you.
            </h1>
            <p className="text-muted-foreground text-base xl:text-lg leading-relaxed max-w-[380px]">
              Share moments, build communities, and stay connected with the people who matter most.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-8 xl:gap-12 pt-1">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <div className="text-2xl xl:text-3xl font-bold text-foreground tracking-tight">{value}</div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards */}
        <div className="space-y-3 relative">
          {features.map(({ icon: Icon, color, iconColor, title, text }) => (
            <div
              key={title}
              className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all duration-200 group"
            >
              <div className={`h-10 w-10 xl:h-11 xl:w-11 rounded-xl bg-gradient-to-br ${color} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                <Icon className={`h-4 w-4 xl:h-5 xl:w-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Vertical divider */}
      <div className="hidden lg:block w-px shrink-0 my-8 self-stretch bg-gradient-to-b from-transparent via-border/50 to-transparent" />

      {/* ── Right form panel ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-10 xl:p-14 relative z-10 min-h-screen">

        {/* Mobile logo */}
        <Link href="/" className="lg:hidden mb-8 inline-block">
          <Logo size="lg" />
        </Link>

        {/* Card */}
        <div className="w-full max-w-[440px] xl:max-w-[460px]">
          <div className="relative bg-card/80 dark:bg-card/50 backdrop-blur-2xl border border-border/50 rounded-2xl p-7 sm:p-8 xl:p-10 shadow-2xl shadow-black/5 dark:shadow-black/40">
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent rounded-t-2xl" />
            {/* Corner glow */}
            <div className="absolute top-0 right-0 h-48 w-48 bg-gradient-to-bl from-purple-600/[0.06] to-transparent rounded-tr-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-32 w-32 bg-gradient-to-tr from-cyan-500/[0.04] to-transparent rounded-bl-2xl pointer-events-none" />

            <div className="relative">
              {children}
            </div>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-muted-foreground/50">
            <ShieldCheck className="h-3 w-3" />
            Secured with end-to-end encryption
          </div>
        </div>
      </div>
    </div>
  )
}
