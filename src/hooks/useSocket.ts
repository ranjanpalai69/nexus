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
    const handleOffline = ({ userId: uid }: { userId: string }) => {
      useChatStore.getState().setUserOnline(uid, false)
    }

    // ── Messages ──────────────────────────────────────────────────
    const handleMessage = (message: MessageWithSender & { tempId?: string }) => {
      const store = useChatStore.getState()
      if (message.tempId && message.sender_id === userId) {
        store.replaceTempMessage(message.conversation_id, message.tempId, message)
      } else {
        store.addMessage(message.conversation_id, message)
        if (message.sender_id !== userId && message.conversation_id !== store.activeConversationId) {
          store.incrementConversationUnread(message.conversation_id)
        }
      }
      store.updateConversation(message.conversation_id, {
        last_message_at: message.created_at,
        last_message_preview:
          message.type === 'text' ? (message.content?.slice(0, 80) ?? '') : `[${message.type}]`,
      })
    }

    // ── Typing ────────────────────────────────────────────────────
    const handleTypingStart = ({ userId: typingId, conversationId }: { userId: string; conversationId: string }) => {
      useChatStore.getState().setTyping(typingId, conversationId, true)
    }
    const handleTypingStop = ({ userId: typingId, conversationId }: { userId: string; conversationId: string }) => {
      useChatStore.getState().setTyping(typingId, conversationId, false)
    }

    // ── Notifications ─────────────────────────────────────────────
    const handleNotification = (notification: NotificationWithActor) => {
      useNotificationStore.getState().addNotification(notification)
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

    socket.on('user:online', handleOnline)
    socket.on('user:offline', handleOffline)
    socket.on('message:new', handleMessage)
    socket.on('typing:start', handleTypingStart)
    socket.on('typing:stop', handleTypingStop)
    socket.on('notification:new', handleNotification)
    socket.on('user:follow_update', handleFollowUpdate)

    return () => {
      socket.off('user:online', handleOnline)
      socket.off('user:offline', handleOffline)
      socket.off('message:new', handleMessage)
      socket.off('typing:start', handleTypingStart)
      socket.off('typing:stop', handleTypingStop)
      socket.off('notification:new', handleNotification)
      socket.off('user:follow_update', handleFollowUpdate)
    }
  }, [userId, queryClient])

  return socketRef.current
}
