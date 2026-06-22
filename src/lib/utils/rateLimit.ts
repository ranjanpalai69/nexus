import { rincr } from '@/lib/redis/client'
import { NextResponse } from 'next/server'

export async function rateLimit(
  identifier: string,
  maxRequests = 10,
  windowSeconds = 60
): Promise<{ success: boolean; remaining: number }> {
  const key = `rate_limit:${identifier}`
  const count = await rincr(key, windowSeconds)
  const remaining = Math.max(0, maxRequests - count)
  return { success: count <= maxRequests, remaining }
}

export function rateLimitResponse() {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    { status: 429, headers: { 'Retry-After': '60' } }
  )
}
