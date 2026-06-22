import { create } from 'zustand'
import type { ConversationWithDetails, MessageWithSender } from '@/types/database'

interface TypingUser {
  userId: string
  conversationId: string
}

interface ChatState {
  conversations: ConversationWithDetails[]
  activeConversationId: string | null
  messages: Record<string, MessageWithSender[]>
  typingUsers: TypingUser[]
  onlineUserIds: Set<string>

  setConversations: (convs: ConversationWithDetails[]) => void
  addConversation: (conv: ConversationWithDetails) => void
  updateConversation: (id: string, updates: Partial<ConversationWithDetails>) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (conversationId: string, messages: MessageWithSender[]) => void
  addMessage: (conversationId: string, message: MessageWithSender) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<MessageWithSender>) => void
  replaceTempMessage: (conversationId: string, tempId: string, message: MessageWithSender) => void
  setTyping: (userId: string, conversationId: string, isTyping: boolean) => void
  setUserOnline: (userId: string, online: boolean) => void
  isUserOnline: (userId: string) => boolean
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: [],
  onlineUserIds: new Set(),

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conv) =>
    set((state) => ({
      conversations: [conv, ...state.conversations.filter((c) => c.id !== conv.id)],
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) =>
    set((state) => ({ messages: { ...state.messages, [conversationId]: messages } })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    })),

  updateMessage: (conversationId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        ),
      },
    })),

  replaceTempMessage: (conversationId, tempId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map((m) =>
          (m as MessageWithSender & { tempId?: string }).tempId === tempId ? message : m
        ),
      },
    })),

  setTyping: (userId, conversationId, isTyping) =>
    set((state) => ({
      typingUsers: isTyping
        ? [...state.typingUsers.filter((t) => t.userId !== userId || t.conversationId !== conversationId), { userId, conversationId }]
        : state.typingUsers.filter((t) => !(t.userId === userId && t.conversationId === conversationId)),
    })),

  setUserOnline: (userId, online) =>
    set((state) => {
      const next = new Set(state.onlineUserIds)
      online ? next.add(userId) : next.delete(userId)
      return { onlineUserIds: next }
    }),

  isUserOnline: (userId) => get().onlineUserIds.has(userId),
}))
