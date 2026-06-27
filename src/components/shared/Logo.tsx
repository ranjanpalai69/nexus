'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  className?: string
}

const heights: Record<string, number> = { sm: 28, md: 34, lg: 44, xl: 56 }
const widths:  Record<string, number> = { sm: 120, md: 148, lg: 190, xl: 240 }

export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const h = heights[size]
  const w = variant === 'icon' ? h : widths[size]

  // Before mount default to dark theme (app default) — avoids flash for most users
  const isDark = !mounted || resolvedTheme !== 'light'

  const LOGO_WHITE = 'https://uutcbsqcrsyvwzycnybu.supabase.co/storage/v1/object/public/media/Nexus-Logo/Nexus-White.png'
  const LOGO_BLACK = 'https://uutcbsqcrsyvwzycnybu.supabase.co/storage/v1/object/public/media/Nexus-Logo/Nexus-Black.png'

  const src = variant === 'icon'
    ? '/Nexus-Favicon.png'
    : isDark ? LOGO_WHITE : LOGO_BLACK

  return (
    <div
      className={cn('shrink-0 select-none', className)}
      style={{ width: w, height: h }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Nexus"
        width={w}
        height={h}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}
