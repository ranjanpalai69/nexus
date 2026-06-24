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

  // For call notifications, always show Accept/Reject action buttons
  const actions = isCall
    ? [{ action: 'accept', title: '✅ Accept' }, { action: 'reject', title: '❌ Reject' }]
    : (payload.actions || [])

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Skip non-call notifications if app tab is already focused on the target page
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

  // ── Reject action: signal the caller without opening the app ──────────────
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

  // ── Accept action or default tap ──────────────────────────────────────────
  const baseUrl = url || (conversationId ? `/messages/${conversationId}` : '/')
  const fullUrl = new URL(baseUrl, self.location.origin)

  if (action === 'accept' && conversationId) {
    fullUrl.searchParams.set('acceptCall', '1')
    if (callerId) fullUrl.searchParams.set('callerId', callerId)
    if (callerName) fullUrl.searchParams.set('callerName', encodeURIComponent(callerName))
    if (callerAvatar) fullUrl.searchParams.set('callerAvatar', encodeURIComponent(callerAvatar))
    if (callType) fullUrl.searchParams.set('callType', callType)
  }

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find(
        (c) => new URL(c.url).origin === self.location.origin
      )

      if (existing) {
        // Post a message for instant auto-accept when app is in background
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
        return existing.focus().then((c) => c.navigate(fullUrl.href))
      }

      // No existing tab — open the app (auto-accept handled via URL params)
      return self.clients.openWindow(fullUrl.href)
    })
  )
})

// ── Message from page (e.g. force SW update) ──────────────────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
