'use client'
import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { getSocket, disconnectSocket } from '@/lib/socket/client'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { useNotificationStore } from '@/store/notificationStore'
import type { MessageWithSender, NotificationWithActor } from '@/types/database'

export function useSocket() {
  const user = useAuthStore((s) => s.user)
  const socketRef = useRef<Socket | null>(null)
  const { setUserOnline, addMessage, setTyping, updateConversation } = useChatStore()
  const { addNotification } = useNotificationStore()

  useEffect(() => {
    if (!user) return

    const socket = getSocket(user.id)
    socketRef.current = socket

    socket.on('user:online', ({ userId }: { userId: string }) => setUserOnline(userId, true))
    socket.on('user:offline', ({ userId }: { userId: string }) => setUserOnline(userId, false))

    socket.on('message:new', (message: MessageWithSender & { tempId?: string }) => {
      addMessage(message.conversation_id, message)
      updateConversation(message.conversation_id, {
        last_message_at: message.created_at,
        last_message_preview: message.type === 'text' ? (message.content?.slice(0, 80) ?? '') : `[${message.type}]`,
      })
    })

    socket.on('typing:start', ({ userId: typingId, conversationId }: { userId: string; conversationId: string }) => {
      setTyping(typingId, conversationId, true)
    })

    socket.on('typing:stop', ({ userId: typingId, conversationId }: { userId: string; conversationId: string }) => {
      setTyping(typingId, conversationId, false)
    })

    socket.on('notification:new', (notification: NotificationWithActor) => {
      addNotification(notification)
    })

    return () => {
      socket.off('user:online')
      socket.off('user:offline')
      socket.off('message:new')
      socket.off('typing:start')
      socket.off('typing:stop')
      socket.off('notification:new')
    }
  }, [user, setUserOnline, addMessage, setTyping, updateConversation, addNotification])

  return socketRef.current
}
