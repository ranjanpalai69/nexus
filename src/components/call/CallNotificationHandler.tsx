'use client'
import { useEffect } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useCallStore } from '@/store/callStore'
import { getSocket } from '@/lib/socket/client'

function autoAccept(
  userId: string,
  conversationId: string,
  callerId: string,
  callerName: string,
  callerAvatar: string | null,
  callType: 'audio' | 'video',
) {
  const { incomingCall, setActiveCall, setIncomingCall } = useCallStore.getState()
  const socket = getSocket(userId)

  const callData = (incomingCall?.conversationId === conversationId)
    ? { type: incomingCall.type, otherUserId: incomingCall.callerId, otherUserName: incomingCall.callerName, otherUserAvatar: incomingCall.callerAvatar, actualCallerId: incomingCall.callerId }
    : { type: callType, otherUserId: callerId, otherUserName: callerName || 'Caller', otherUserAvatar: callerAvatar, actualCallerId: callerId }

  socket.emit('call:accept', { conversationId, callerId: callData.actualCallerId })
  socket.emit('conversation:join', conversationId)
  setActiveCall({
    conversationId,
    type: callData.type,
    direction: 'inbound',
    status: 'connecting',
    startedAt: null,
    otherUserId: callData.otherUserId,
    otherUserName: callData.otherUserName,
    otherUserAvatar: callData.otherUserAvatar,
  })
  setIncomingCall(null)
}

export function CallNotificationHandler() {
  const userId = useAuthStore((s) => s.user?.id)
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Handle SW postMessage (app was backgrounded)
  useEffect(() => {
    if (!userId || !('serviceWorker' in navigator)) return

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'CALL_ACCEPT_ACTION') return
      const { conversationId, callerId, callerName, callerAvatar, callType } = event.data
      if (!conversationId) return
      autoAccept(userId, conversationId, callerId, callerName, callerAvatar, callType || 'audio')
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [userId])

  // Handle URL params (app was fully closed, SW opened it via openWindow)
  useEffect(() => {
    if (!userId) return
    if (searchParams.get('acceptCall') !== '1') return

    const callerId = searchParams.get('callerId') || ''
    const callerName = searchParams.get('callerName') || 'Caller'
    const callerAvatar = searchParams.get('callerAvatar') || null
    const callType = (searchParams.get('callType') || 'audio') as 'audio' | 'video'

    // Extract conversationId from /messages/[conversationId]
    const match = pathname.match(/\/messages\/([^/?]+)/)
    const conversationId = match?.[1]
    if (!conversationId) return

    // Give the socket time to connect before accepting
    const timer = setTimeout(() => {
      autoAccept(
        userId,
        conversationId,
        callerId,
        decodeURIComponent(callerName),
        callerAvatar ? decodeURIComponent(callerAvatar) : null,
        callType,
      )
      // Clean up URL params
      window.history.replaceState({}, '', pathname)
    }, 1500)

    return () => clearTimeout(timer)
  }, [userId, searchParams, pathname])

  return null
}
