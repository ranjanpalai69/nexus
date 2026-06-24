'use client'
import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { getSocket } from '@/lib/socket/client'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { MessageWithSender, NotificationWithActor } from '@/types/database'
import { useCallStore } from '@/store/callStore'
import type { IncomingCall } from '@/store/callStore'
import { emitCallEvent } from '@/lib/callEvents'

let _audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    _audioCtx = new AudioCtx()
  }
  return _audioCtx
}

function playNotificationSound() {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch {}
}

export function useSocket() {
  const userId = useAuthStore((s) => s.user?.id)
  const socketRef = useRef<Socket | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const socket = getSocket(userId)
    socketRef.current = socket

    // ── Presence ─────────────────────────────────────────────────
    const handleOnline = ({ userId: uid }: { userId: string }) => {
      useChatStore.getState().setUserOnline(uid, true)
    }
    const handleOffline = ({ userId: uid, lastSeen }: { userId: string; lastSeen?: string }) => {
      useChatStore.getState().setUserOnline(uid, false)
      if (lastSeen) {
        const convs = useChatStore.getState().conversations
        convs.forEach((conv) => {
          const p = conv.participants?.find((pt) => pt.user_id === uid)
          if (p?.profile) (p.profile as Record<string, unknown>).last_seen = lastSeen
        })
      }
    }

    // ── Messages ──────────────────────────────────────────────────
    const handleMessage = (message: MessageWithSender & { tempId?: string }) => {
      const store = useChatStore.getState()
      const isActive = message.conversation_id === store.activeConversationId

      if (message.tempId && message.sender_id === userId) {
        store.replaceTempMessage(message.conversation_id, message.tempId, message)
      } else if (message.sender_id !== userId) {
        store.addMessage(message.conversation_id, message)

        if (isActive) {
          socket.emit('messages:read', { conversationId: message.conversation_id })
        } else {
          store.incrementConversationUnread(message.conversation_id)
          playNotificationSound()

          const senderName = message.sender?.full_name || message.sender?.username || 'New message'
          const preview = message.type === 'text'
            ? (message.content?.slice(0, 60) ?? '')
            : `[${message.type}]`

          toast(`${senderName}${preview ? ': ' + preview : ''}`, {
            duration: 4000,
            position: 'top-right',
            icon: '💬',
            style: { cursor: 'pointer' },
            id: `msg-${message.conversation_id}`,
          })
        }
      }

      store.updateConversation(message.conversation_id, {
        last_message_at: message.created_at,
        last_message_preview: message.type === 'text' ? (message.content?.slice(0, 80) ?? '') : `[${message.type}]`,
        last_message_sender_id: message.sender_id,
      })
    }

    // ── Typing ────────────────────────────────────────────────────
    const handleTypingStart = ({ userId: typingId, conversationId }: { userId: string; conversationId: string }) => {
      useChatStore.getState().setTyping(typingId, conversationId, true)
    }
    const handleTypingStop = ({ userId: typingId, conversationId }: { userId: string; conversationId: string }) => {
      useChatStore.getState().setTyping(typingId, conversationId, false)
    }

    // ── Read receipts ────────────────────────────────────────────
    const handleMessagesRead = ({ conversationId, userId: readerId, readAt }: {
      conversationId: string; userId: string; readAt: string
    }) => {
      const store = useChatStore.getState()
      const conv = store.conversations.find((c) => c.id === conversationId)
      if (conv) {
        const updatedParticipants = conv.participants?.map((p) =>
          p.user_id === readerId ? { ...p, last_read_at: readAt } : p
        )
        store.updateConversation(conversationId, { participants: updatedParticipants })
      }
    }

    // ── Notifications ─────────────────────────────────────────────
    const handleNotification = (notification: NotificationWithActor) => {
      useNotificationStore.getState().addNotification(notification)
      playNotificationSound()
    }

    // ── Stories ───────────────────────────────────────────────────
    const handleStoryNew = () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    }

    // ── Follow updates ────────────────────────────────────────────
    const handleFollowUpdate = (data: {
      type: 'follow' | 'unfollow'
      followersCount?: number
      followingCount?: number
    }) => {
      const { updateProfile } = useAuthStore.getState()
      if (data.followersCount !== undefined) updateProfile({ followers_count: data.followersCount })
      if (data.followingCount !== undefined) {
        updateProfile({ following_count: data.followingCount })
        if (data.type === 'follow') {
          queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] })
        }
      }
    }

    // ── Conversation updates ──────────────────────────────────────
    const handleConversationUpdated = (data: {
      conversationId: string
      lastMessageAt: string
      lastMessagePreview: string
      senderId: string
    }) => {
      const store = useChatStore.getState()
      const exists = store.conversations.some((c) => c.id === data.conversationId)
      if (exists) {
        store.updateConversation(data.conversationId, {
          last_message_at: data.lastMessageAt,
          last_message_preview: data.lastMessagePreview,
          last_message_sender_id: data.senderId,
        })
        if (data.senderId !== userId) {
          store.incrementConversationUnread(data.conversationId)
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }
    }

    // ── Call: modal events (set/clear incomingCall) ───────────────
    const handleCallInvite = (data: IncomingCall) => {
      const { activeCall } = useCallStore.getState()
      if (activeCall) {
        socket.emit('call:busy', { conversationId: data.conversationId, callerId: data.callerId })
        return
      }
      useCallStore.getState().setIncomingCall(data)
    }

    const handleCallCancel = () => {
      useCallStore.getState().setIncomingCall(null)
    }

    // ── Call: WebRTC signaling → forwarded to callEvents bus ──────
    // useSocket is always mounted; CallOverlay subscribes to the bus on mount.
    // This prevents events from being dropped when CallOverlay hasn't rendered yet.
    const handleCallAccept = (data: unknown) => emitCallEvent('accept', data)
    const handleCallOffer = (data: unknown) => emitCallEvent('offer', data)
    const handleCallAnswer = (data: unknown) => emitCallEvent('answer', data)
    const handleCallIce = (data: unknown) => emitCallEvent('ice', data)
    const handleCallEnd = (data: unknown) => {
      emitCallEvent('end', data)
      useCallStore.getState().setIncomingCall(null) // clear missed-call modal if open
    }
    const handleCallReject = (data: unknown) => emitCallEvent('reject', data)
    const handleCallBusy = (data: unknown) => emitCallEvent('busy', data)

    socket.on('user:online', handleOnline)
    socket.on('user:offline', handleOffline)
    socket.on('message:new', handleMessage)
    socket.on('messages:read', handleMessagesRead)
    socket.on('typing:start', handleTypingStart)
    socket.on('typing:stop', handleTypingStop)
    socket.on('notification:new', handleNotification)
    socket.on('user:follow_update', handleFollowUpdate)
    socket.on('conversation:updated', handleConversationUpdated)
    socket.on('story:new', handleStoryNew)
    socket.on('call:invite', handleCallInvite)
    socket.on('call:cancel', handleCallCancel)
    socket.on('call:accept', handleCallAccept)
    socket.on('call:offer', handleCallOffer)
    socket.on('call:answer', handleCallAnswer)
    socket.on('call:ice-candidate', handleCallIce)
    socket.on('call:end', handleCallEnd)
    socket.on('call:reject', handleCallReject)
    socket.on('call:busy', handleCallBusy)

    return () => {
      socket.off('user:online', handleOnline)
      socket.off('user:offline', handleOffline)
      socket.off('message:new', handleMessage)
      socket.off('messages:read', handleMessagesRead)
      socket.off('typing:start', handleTypingStart)
      socket.off('typing:stop', handleTypingStop)
      socket.off('notification:new', handleNotification)
      socket.off('user:follow_update', handleFollowUpdate)
      socket.off('conversation:updated', handleConversationUpdated)
      socket.off('story:new', handleStoryNew)
      socket.off('call:invite', handleCallInvite)
      socket.off('call:cancel', handleCallCancel)
      socket.off('call:accept', handleCallAccept)
      socket.off('call:offer', handleCallOffer)
      socket.off('call:answer', handleCallAnswer)
      socket.off('call:ice-candidate', handleCallIce)
      socket.off('call:end', handleCallEnd)
      socket.off('call:reject', handleCallReject)
      socket.off('call:busy', handleCallBusy)
    }
  }, [userId, queryClient])

  return socketRef.current
}
