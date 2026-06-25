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
    requireInteraction = false,
  } = payload

  const isCall = tag === 'call'

  // For call notifications always show Accept / Reject action buttons
  const actions = isCall
    ? [{ action: 'accept', title: '✅ Accept' }, { action: 'reject', title: '❌ Reject' }]
    : (payload.actions || [])

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Skip non-call notifications if the app is already focused on the target page
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
  const action = e.action
  const { conversationId, callerId, callerName, callerAvatar, callType, url = '/' } = notifData

  // ── Reject: signal the caller without opening the app ─────────────────────
  if (action === 'reject') {
    e.waitUntil(
      fetch('/api/calls/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerId, conversationId }),
      }).catch(() => {})
    )
    return
  }

  // ── Accept or default tap ──────────────────────────────────────────────────
  const baseUrl = new URL(url || (conversationId ? `/messages/${conversationId}` : '/'), self.location.origin)

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find(
        (c) => new URL(c.url).origin === self.location.origin
      )

      if (existing) {
        // App is already open — send a message for instant auto-accept.
        // Navigate to the conversation WITHOUT acceptCall params; the SW message
        // handler in CallNotificationHandler takes care of accepting, so we must NOT
        // also set the URL param (that would trigger a second conflicting accept).
        if (action === 'accept' && conversationId) {
          existing.postMessage({
            type: 'CALL_ACCEPT_ACTION',
            conversationId,
            callerId,
            callerName,
            callerAvatar,
            callType,
          })
        }
        return existing.focus().then((c) => c.navigate(baseUrl.href))
      }

      // App is closed — open it. For accept, embed params so CallNotificationHandler
      // can auto-accept once the socket connects (~1.5 s delay).
      if (action === 'accept' && conversationId) {
        baseUrl.searchParams.set('acceptCall', '1')
        if (callerId) baseUrl.searchParams.set('callerId', callerId)
        if (callerName) baseUrl.searchParams.set('callerName', encodeURIComponent(callerName))
        if (callerAvatar) baseUrl.searchParams.set('callerAvatar', encodeURIComponent(callerAvatar))
        if (callType) baseUrl.searchParams.set('callType', callType)
      }
      return self.clients.openWindow(baseUrl.href)
    })
  )
})

// ── Message from page (e.g. force SW update) ──────────────────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
