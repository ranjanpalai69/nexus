'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  className?: string
}

// Natural aspect ratio of the PNG (~4.6 : 1). Icon clips to the leading "N".
const heights: Record<string, number> = { sm: 28, md: 34, lg: 44, xl: 56 }
const widths:  Record<string, number> = { sm: 120, md: 148, lg: 190, xl: 240 }

export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const h = heights[size]
  const w = widths[size]
  const iconW = Math.round(h * 1.1)
  const containerW = variant === 'icon' ? iconW : w

  // Before mount default to dark (matches defaultTheme="dark") to avoid flash
  const isDark = !mounted || resolvedTheme === 'dark'
  const src = isDark ? '/Nexus-White.png' : '/Nexus-Black.png'

  return (
    <div
      className={cn('shrink-0 select-none overflow-hidden', className)}
      style={{ width: containerW, height: h }}
    >
      <img
        src={src}
        alt="Nexus"
        style={{ height: h, width: 'auto', display: 'block' }}
        className={cn(
          variant === 'icon' ? 'max-w-none' : 'object-contain object-left',
          'transition-opacity duration-200'
        )}
        loading="eager"
      />
    </div>
  )
}
