import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/shared/Logo'
import { AuthBackground } from '@/components/auth/AuthBackground'

export const metadata: Metadata = { title: 'Auth' }

const features = [
  {
    icon: '⚡',
    title: 'Real-time everything',
    text: 'Instant messages, live updates, and real-time feeds',
  },
  {
    icon: '🌐',
    title: 'Global community',
    text: 'Connect with people across the world',
  },
  {
    icon: '🔒',
    title: 'Privacy-first design',
    text: 'Your data stays yours with security-always architecture',
  },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex bg-background">
      <AuthBackground />

      {/* ─── Left Branding Panel (lg+) ─── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 flex-col justify-between p-10 xl:p-16 relative z-10">
        <Link href="/" className="inline-block">
          <Logo size="md" />
        </Link>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-500 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
            </span>
            Now live · Join thousands
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-foreground">
            Connect with the{' '}
            <span className="text-gradient">
              world around you.
            </span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
            Share moments, build communities, and stay connected with the people who matter most.
          </p>
        </div>

        <div className="space-y-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-purple-500/20 flex items-center justify-center text-lg shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right Form Panel ─── */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative z-10 min-h-screen">
        {/* Mobile Logo */}
        <Link href="/" className="lg:hidden mb-8">
          <Logo size="lg" />
        </Link>

        {/* Card */}
        <div className="w-full max-w-md">
          <div className="relative bg-card/70 dark:bg-card/50 backdrop-blur-2xl border border-border/60 rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/5 dark:shadow-black/30">
            {/* Subtle top glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent rounded-t-2xl" />
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
