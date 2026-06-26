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
  const w = widths[size]
  const iconW = Math.round(h * 1.1)
  const containerW = variant === 'icon' ? iconW : w

  return (
    <div
      className={cn('relative shrink-0 select-none', className)}
      style={{ width: containerW, height: h }}
    >
      {/* Light mode — show black logo */}
      <img
        src="/Nexus-Black.png"
        alt="Nexus"
        style={{ height: h, width: 'auto', position: 'absolute', top: 0, left: 0 }}
        className="block dark:hidden"
        loading="eager"
        draggable={false}
      />
      {/* Dark mode — show white logo */}
      <img
        src="/Nexus-White.png"
        alt="Nexus"
        style={{ height: h, width: 'auto', position: 'absolute', top: 0, left: 0 }}
        className="hidden dark:block"
        loading="eager"
        draggable={false}
      />
    </div>
  )
}
