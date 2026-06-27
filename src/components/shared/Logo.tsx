import { cn } from '@/lib/utils/cn'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  className?: string
}

const heights: Record<string, number> = { sm: 28, md: 34, lg: 44, xl: 56 }
const widths:  Record<string, number> = { sm: 120, md: 148, lg: 190, xl: 240 }

export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const h = heights[size]
  const w = variant === 'icon' ? h : widths[size]

  if (variant === 'icon') {
    return (
      <div className={cn('shrink-0 select-none', className)} style={{ width: w, height: h }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Nexus-Favicon.png" alt="Nexus" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    )
  }

  return (
    <div className={cn('relative shrink-0 select-none', className)} style={{ width: w, height: h }}>
      {/* Light mode — black logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Nexus-Black.png"
        alt="Nexus"
        className="absolute inset-0 w-full h-full object-contain dark:hidden"
      />
      {/* Dark mode — white logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Nexus-White.png"
        alt="Nexus"
        className="absolute inset-0 w-full h-full object-contain hidden dark:block"
      />
    </div>
  )
}
