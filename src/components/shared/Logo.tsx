import { cn } from '@/lib/utils/cn'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  className?: string
}

const iconSizes = { sm: 28, md: 36, lg: 44, xl: 56 }
const textSizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl', xl: 'text-3xl' }

export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const s = iconSizes[size]
  const t = textSizes[size]

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <svg
        width={s}
        height={s}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="nexus-logo-grad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <filter id="nexus-glow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#6366f1" floodOpacity="0.35" />
          </filter>
        </defs>
        <rect width="200" height="200" rx="44" fill="url(#nexus-logo-grad)" filter="url(#nexus-glow)" />
        <rect width="200" height="200" rx="44" fill="white" fillOpacity="0.06" />
        <circle cx="52" cy="52" r="9" fill="white" fillOpacity="0.95" />
        <circle cx="148" cy="52" r="9" fill="white" fillOpacity="0.95" />
        <circle cx="52" cy="148" r="9" fill="white" fillOpacity="0.95" />
        <circle cx="148" cy="148" r="9" fill="white" fillOpacity="0.95" />
        <circle cx="100" cy="116" r="6" fill="white" fillOpacity="0.9" />
        <line x1="52" y1="52" x2="52" y2="148" stroke="white" strokeWidth="11" strokeLinecap="round" />
        <line x1="52" y1="52" x2="148" y2="148" stroke="white" strokeWidth="11" strokeLinecap="round" />
        <line x1="148" y1="52" x2="148" y2="148" stroke="white" strokeWidth="11" strokeLinecap="round" />
        <circle cx="76" cy="76" r="4" fill="white" fillOpacity="0.45" />
        <circle cx="124" cy="124" r="4" fill="white" fillOpacity="0.45" />
      </svg>

      {variant === 'full' && (
        <span
          className={cn(
            'font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 bg-clip-text text-transparent',
            t
          )}
        >
          nexus
        </span>
      )}
    </div>
  )
}
