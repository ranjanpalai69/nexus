// Nexus Service Worker — push notifications + basic caching

const CACHE = 'nexus-v2'
const STATIC = ['/manifest.json', '/logo.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Push notification handler ──────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return

  let payload
  try { payload = e.data.json() } catch { return }

  const {
    title = 'Nexus',
    body = '',
    icon = '/logo.svg',
    badge = '/logo.svg',
    tag = 'nexus',
    url = '/',
    data = {},
    actions = [],
    requireInteraction = false,
  } = payload

  const isCall = tag === 'call'

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is focused on the exact target page, skip the notification
      // (except calls — always show those so the ringtone still fires)
      if (!isCall) {
        const targetPath = new URL(url, self.location.origin).pathname
        const isFocused = windowClients.some(
          (c) => c.focused && new URL(c.url).pathname === targetPath
        )
        if (isFocused) return
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

// ── Notification click handler ─────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close()

  const url = e.notification.data?.url || '/'
  const fullUrl = new URL(url, self.location.origin).href

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing tab at the same origin first
      for (const client of windowClients) {
        if (new URL(client.url).origin === self.location.origin) {
          return client.focus().then((c) => c.navigate(fullUrl))
        }
      }
      // No existing tab — open one
      return self.clients.openWindow(fullUrl)
    })
  )
})

// ── Message from page (e.g. force update) ─────────────────────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
