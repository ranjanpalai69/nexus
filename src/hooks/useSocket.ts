'use client'
import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { getSocket } from '@/lib/socket/client'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useQueryClient } from '@tanstack/react-query'
import type { MessageWithSender, NotificationWithActor } from '@/types/database'

export function useSocket() {
  const user = useAuthStore((s) => s.user)
  const socketRef = useRef<Socket | null>(null)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const { addNotification } = useNotificationStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return

    const socket = getSocket(user.id)
    socketRef.current = socket

    // ── Presence ─────────────────────────────────────────────────
    socket.on('user:online', ({ userId }: { userId: string }) => {
      useChatStore.getState().setUserOnline(userId, true)
    })
    socket.on('user:offline', ({ userId }: { userId: string }) => {
      useChatStore.getState().setUserOnline(userId, false)
    })

    // ── Messages ──────────────────────────────────────────────────
    socket.on('message:new', (message: MessageWithSender & { tempId?: string }) => {
      const store = useChatStore.getState()
      if (message.tempId && message.sender_id === user.id) {
        store.replaceTempMessage(message.conversation_id, message.tempId, message)
      } else {
        store.addMessage(message.conversation_id, message)
        if (message.sender_id !== user.id && message.conversation_id !== store.activeConversationId) {
          store.incrementConversationUnread(message.conversation_id)
        }
      }
      store.updateConversation(message.conversation_id, {
        last_message_at: message.created_at,
        last_message_preview:
          message.type === 'text' ? (message.content?.slice(0, 80) ?? '') : `[${message.type}]`,
      })
    })

    // ── Typing ────────────────────────────────────────────────────
    socket.on('typing:start', ({ userId: typingId, conversationId }: { userId: string; conversationId: string }) => {
      useChatStore.getState().setTyping(typingId, conversationId, true)
    })
    socket.on('typing:stop', ({ userId: typingId, conversationId }: { userId: string; conversationId: string }) => {
      useChatStore.getState().setTyping(typingId, conversationId, false)
    })

    // ── Notifications ─────────────────────────────────────────────
    socket.on('notification:new', (notification: NotificationWithActor) => {
      addNotification(notification)
    })

    // ── Follow updates ────────────────────────────────────────────
    socket.on('user:follow_update', (data: {
      type: 'follow' | 'unfollow'
      followersCount?: number
      followingCount?: number
    }) => {
      if (data.followersCount !== undefined) updateProfile({ followers_count: data.followersCount })
      if (data.followingCount !== undefined) {
        updateProfile({ following_count: data.followingCount })
        // Refresh feed when we follow someone — their posts should now appear
        if (data.type === 'follow') {
          queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] })
        }
      }
    })

    return () => {
      socket.off('user:online')
      socket.off('user:offline')
      socket.off('message:new')
      socket.off('typing:start')
      socket.off('typing:stop')
      socket.off('notification:new')
      socket.off('user:follow_update')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return socketRef.current
}
