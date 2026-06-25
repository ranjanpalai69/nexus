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
      // Skip non-call notifications if the app tab is already focused on the target page
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

  const notifData = e.notification.data || {}
  const { conversationId, callerId, callerName, callerAvatar, callType, url = '/' } = notifData
  const isCall = e.notification.tag === 'call'

  // Build target URL — for calls, embed caller info so the page can show the modal
  // even if the app was completely closed (socket wasn't connected to receive call:invite)
  const targetUrl = new URL(url || '/', self.location.origin)
  if (isCall && conversationId) {
    targetUrl.searchParams.set('showCall', '1')
    if (callerId) targetUrl.searchParams.set('callerId', callerId)
    if (callerName) targetUrl.searchParams.set('callerName', encodeURIComponent(callerName))
    if (callerAvatar) targetUrl.searchParams.set('callerAvatar', encodeURIComponent(callerAvatar))
    if (callType) targetUrl.searchParams.set('callType', callType)
  }

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing app window and navigate it to the target URL
      const existing = windowClients.find(
        (c) => new URL(c.url).origin === self.location.origin
      )
      if (existing) {
        return existing.focus().then((c) => c.navigate(targetUrl.href))
      }
      // No existing tab — open one
      return self.clients.openWindow(targetUrl.href)
    })
  )
})

// ── Message from page (e.g. force SW update) ──────────────────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
