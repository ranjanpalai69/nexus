'use client'
import { useEffect } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useCallStore } from '@/store/callStore'

// Handles the case where the user tapped a call push notification while the app
// was completely closed. The SW opens the app with ?showCall=1 + caller info in
// the URL. We read those params and set incomingCall in the store so the
// IncomingCallModal appears immediately — then the user taps Accept/Reject as normal.
//
// When the app is already open (socket connected), the socket call:invite event
// already set incomingCall in the store, so this component does nothing.
export function CallNotificationHandler() {
  const userId = useAuthStore((s) => s.user?.id)
  const searchParams = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    if (!userId) return
    if (searchParams.get('showCall') !== '1') return

    const callerId = searchParams.get('callerId') || ''
    const callerName = searchParams.get('callerName') || 'Caller'
    const callerAvatar = searchParams.get('callerAvatar') || null
    const callType = (searchParams.get('callType') || 'audio') as 'audio' | 'video'

    // Extract conversationId from /messages/[conversationId]
    const match = pathname.match(/\/messages\/([^/?]+)/)
    const conversationId = match?.[1]
    if (!conversationId || !callerId) return

    // Only set incomingCall if it's not already set (socket may have beaten us)
    if (!useCallStore.getState().incomingCall && !useCallStore.getState().activeCall) {
      useCallStore.getState().setIncomingCall({
        conversationId,
        callerId,
        callerName: decodeURIComponent(callerName),
        callerAvatar: callerAvatar ? decodeURIComponent(callerAvatar) : null,
        type: callType,
      })
    }

    // Clean URL params so refreshing doesn't re-trigger
    window.history.replaceState({}, '', pathname)
  }, [userId, searchParams, pathname])

  return null
}
