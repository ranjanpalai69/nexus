import { cn } from '@/lib/utils/cn'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  className?: string
}

// Approximate natural aspect ratio of the PNG (~4.6 : 1)
// The "N" icon occupies the leftmost ~22% of the full image width
const heights = { sm: 28, md: 34, lg: 44, xl: 56 }
const widths  = { sm: 120, md: 148, lg: 190, xl: 240 }

export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const h = heights[size]
  const w = widths[size]
  const iconW = Math.round(h * 1.1)   // clip container for icon-only variant
  const containerW = variant === 'icon' ? iconW : w

  const imgCls = variant === 'icon'
    ? 'h-full w-auto max-w-none'
    : 'h-full w-auto object-contain object-left'

  return (
    <div
      className={cn('overflow-hidden shrink-0 select-none', className)}
      style={{ width: containerW, height: h }}
    >
      {/* light mode — hidden when <html class="dark"> */}
      <img
        src="/Nexus-Black.png"
        alt="Nexus"
        height={h}
        loading="eager"
        className={cn(imgCls, 'dark:hidden')}
      />
      {/* dark mode — visible only when <html class="dark"> */}
      <img
        src="/Nexus-White.png"
        alt=""
        aria-hidden="true"
        height={h}
        loading="eager"
        className={cn(imgCls, 'hidden dark:block')}
      />
    </div>
  )
}
