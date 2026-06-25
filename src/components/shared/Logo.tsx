'use client'
import { cn } from '@/lib/utils/cn'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  className?: string
}

const iconSizes = { sm: 26, md: 34, lg: 42, xl: 54 }
const textSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl', xl: 'text-3xl' }

// Gradient stops matching the reference logo:  orange → pink → purple → cyan
const GRAD_ID = 'nexus-n-grad'

export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const s = iconSizes[size]
  const t = textSizes[size]

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <svg
        width={s}
        height={s}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* diagonal: bottom-left (orange) → top-right (cyan) */}
          <linearGradient id={GRAD_ID} x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#FF5C00" />
            <stop offset="33%"  stopColor="#E91E8C" />
            <stop offset="66%"  stopColor="#9333EA" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        {/* N shape: bottom-left → top-left → bottom-right → top-right */}
        <path
          d="M 16 84 L 16 16 L 84 84 L 84 16"
          stroke={`url(#${GRAD_ID})`}
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {variant === 'full' && (
        <span
          className={cn(
            'font-black tracking-[0.22em] uppercase dark:text-white text-gray-900',
            t
          )}
        >
          Nexus
        </span>
      )}
    </div>
  )
}
