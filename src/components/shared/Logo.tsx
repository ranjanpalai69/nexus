'use client'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  className?: string
}

// Approximate aspect ratio of the logo PNGs (~4.6 : 1 width:height)
// The N icon takes up the leftmost ~1/4.6 of the image width.
// For "icon" variant we overflow-clip to show only the icon portion.
const heights = { sm: 28, md: 34, lg: 44, xl: 56 }
const fullWidths = { sm: 120, md: 148, lg: 190, xl: 240 }

export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const h = heights[size]
  const w = fullWidths[size]
  // PNG natural ratio ≈ 4.6 : 1; icon occupies leftmost ~21% of width ≈ h * 1.05
  const iconW = Math.round(h * 1.1)

  const src = !mounted || resolvedTheme === 'dark' ? '/Nexus-White.png' : '/Nexus-Black.png'

  if (variant === 'icon') {
    return (
      <div
        className={cn('overflow-hidden shrink-0 select-none', className)}
        style={{ width: iconW, height: h }}
      >
        <Image
          src={src}
          alt="Nexus"
          width={w}
          height={h}
          className="h-full w-auto max-w-none"
          priority
          unoptimized
        />
      </div>
    )
  }

  return (
    <div className={cn('shrink-0 select-none', className)} style={{ height: h }}>
      <Image
        src={src}
        alt="Nexus"
        width={w}
        height={h}
        className="h-full w-auto object-contain object-left"
        priority
        unoptimized
      />
    </div>
  )
}
