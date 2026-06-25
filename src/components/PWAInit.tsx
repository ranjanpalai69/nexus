'use client'
import { useEffect } from 'react'

// Registers the service worker for all users (auth and unauth).
// Push subscription setup is handled separately in usePushSubscription.
export function PWAInit() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    }).catch((err) => console.warn('[sw]', err))
  }, [])
  return null
}
