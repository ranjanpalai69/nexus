// @ts-nocheck
'use client'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushSubscription() {
  const userId = useAuthStore((s) => s.user?.id)
  const registeredRef = useRef(false)

  useEffect(() => {
    if (!userId) { registeredRef.current = false; return }
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return
    if (registeredRef.current) return

    const register = async () => {
      try {
        // Register service worker (or get existing registration)
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        // Tell a waiting SW (new version) to activate immediately
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })

        // Wait until active
        await navigator.serviceWorker.ready

        if (Notification.permission === 'denied') return

        if (Notification.permission !== 'granted') {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') return
        }

        let sub = await reg.pushManager.getSubscription()

        // Re-subscribe if expired or near expiry (within 7 days)
        if (sub && sub.expirationTime && sub.expirationTime - Date.now() < 7 * 24 * 60 * 60 * 1000) {
          await sub.unsubscribe()
          sub = null
        }

        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
          })
        }

        // Persist subscription on server
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })

        if (res.ok) registeredRef.current = true
      } catch (err) {
        console.error('[push] subscription failed:', err)
      }
    }

    register()
  }, [userId])
}
