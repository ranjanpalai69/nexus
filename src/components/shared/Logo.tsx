import { cn } from '@/lib/utils/cn'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  className?: string
}

const heights: Record<string, number> = { sm: 28, md: 34, lg: 44, xl: 56 }
const widths:  Record<string, number> = { sm: 120, md: 148, lg: 190, xl: 240 }

/**
 * Inline SVG logo — no image file loading, never breaks.
 * The gradient N icon is always visible; the NEXUS wordmark
 * uses currentColor so it adapts to light/dark via CSS automatically.
 */
export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const h = heights[size]
  const containerW = variant === 'icon' ? Math.round(h * 1.1) : widths[size]
  const gid = `ng${size}` // stable gradient ID per size

  return (
    <div
      className={cn('shrink-0 select-none text-foreground', className)}
      style={{ width: containerW, height: h, lineHeight: 0 }}
      aria-label="Nexus"
    >
      <svg
        viewBox={variant === 'icon' ? '0 0 66 60' : '0 0 260 60'}
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="60" x2="60" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#FF5C00" />
            <stop offset="33%"  stopColor="#E91E8C" />
            <stop offset="66%"  stopColor="#9333EA" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>

        {/* Gradient N icon */}
        <path
          d="M 10 50 L 10 10 L 50 50 L 50 10"
          stroke={`url(#${gid})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* NEXUS wordmark — inherits parent text color via currentColor */}
        {variant === 'full' && (
          <text
            x="72"
            y="42"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
            fontSize="26"
            fontWeight="900"
            letterSpacing="6"
            fill="currentColor"
          >
            NEXUS
          </text>
        )}
      </svg>
    </div>
  )
}
