// Nexus Service Worker — handles push notifications and basic caching

const CACHE = 'nexus-v1'
const STATIC = ['/', '/manifest.json', '/logo.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Push notification handler ─────────────────────────────────────────────────
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

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      requireInteraction,
      actions,
      data: { url, ...data },
    })
  )
})

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close()

  const url = e.notification.data?.url || '/'

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        const clientUrl = new URL(client.url)
        const targetUrl = new URL(url, self.location.origin)
        if (clientUrl.pathname === targetUrl.pathname) {
          return client.focus()
        }
      }
      // Open new tab
      return clients.openWindow(url)
    })
  )
})
