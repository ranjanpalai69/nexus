// Nexus Service Worker — push notifications + PWA caching

const CACHE = 'nexus-v4'
const OFFLINE = '/offline.html'

// Pre-cache critical shell assets on install
const PRECACHE = [
  OFFLINE,
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/Nexus-Black.png',
  '/Nexus-White.png',
  '/Nexus-Favicon.png',
  '/manifest.json',
]

// ── Lifecycle ───────────────────────────────────────────────────────────────

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch((err) => console.warn('[sw] precache partial failure:', err))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch — caching strategies ──────────────────────────────────────────────

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // API calls — always network, never cache
  if (url.pathname.startsWith('/api/')) return

  // Next.js static chunks + public images/fonts → Cache-first
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image/') ||
    /\.(png|jpe?g|svg|gif|webp|ico|woff2?|ttf|otf)$/i.test(url.pathname)

  if (isStaticAsset) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // HTML navigation → Network-first, offline.html fallback
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          // Cache a fresh copy of the page if successful
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
          }
          return res
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached || caches.match(OFFLINE).then((r) => r || new Response('Offline', { status: 503 }))
          )
        )
    )
    return
  }
})

// ── Push notification handler ───────────────────────────────────────────────

self.addEventListener('push', (e) => {
  if (!e.data) return

  let payload
  try { payload = e.data.json() } catch { return }

  const {
    title = 'Nexus',
    body = '',
    icon = '/icon-192.png',
    badge = '/icon-192.png',
    tag = 'nexus',
    url = '/',
    data = {},
    actions = [],
    requireInteraction = false,
  } = payload

  const isCall = tag === 'call'

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (!isCall) {
        const targetPath = new URL(url, self.location.origin).pathname
        const focused = clients.some((c) => c.focused && new URL(c.url).pathname === targetPath)
        if (focused) return
      }
      return self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag,
        renotify: true,
        requireInteraction,
        actions,
        vibrate: isCall ? [300, 100, 300, 100, 300] : [200],
        data: { url, ...data },
      })
    })
  )
})

// ── Notification click ──────────────────────────────────────────────────────

self.addEventListener('notificationclick', (e) => {
  e.notification.close()

  const notifData = e.notification.data || {}
  const { conversationId, callerId, callerName, callerAvatar, callType, url = '/' } = notifData
  const isCall = e.notification.tag === 'call'

  const targetUrl = new URL(url || '/', self.location.origin)
  if (isCall && conversationId) {
    targetUrl.searchParams.set('showCall', '1')
    if (callerId)     targetUrl.searchParams.set('callerId', callerId)
    if (callerName)   targetUrl.searchParams.set('callerName', encodeURIComponent(callerName))
    if (callerAvatar) targetUrl.searchParams.set('callerAvatar', encodeURIComponent(callerAvatar))
    if (callType)     targetUrl.searchParams.set('callType', callType)
  }

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => new URL(c.url).origin === self.location.origin)
      if (existing) return existing.focus().then((c) => c.navigate(targetUrl.href))
      return self.clients.openWindow(targetUrl.href)
    })
  )
})

// ── Messages from page ──────────────────────────────────────────────────────

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
