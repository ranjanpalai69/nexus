'use client'
import { use, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { MessageThread } from '@/components/chat/MessageThread'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faCircle, faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { useChatStore } from '@/store/chatStore'
import { ConversationList } from '@/components/chat/ConversationList'
import { NewMessageModal } from '@/components/chat/NewMessageModal'
import { AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import type { ConversationWithDetails, Profile } from '@/types/database'

function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return 'Offline'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Last seen just now'
  if (mins < 60) return `Last seen ${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Last seen ${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `Last seen ${days}d ago`
}

export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params)
  const currentUser = useAuthStore((s) => s.user)
  const setConversations = useChatStore((s) => s.setConversations)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const clearConversationUnread = useChatStore((s) => s.clearConversationUnread)
  const isUserOnline = useChatStore((s) => s.isUserOnline)
  const allTypingUsers = useChatStore((s) => s.typingUsers)
  const router = useRouter()

  useEffect(() => {
    setActiveConversation(conversationId)
    clearConversationUnread(conversationId)
    return () => setActiveConversation(null)
  }, [conversationId, setActiveConversation, clearConversationUnread])

  const { data: conversationsData } = useQuery<ConversationWithDetails[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/messages')
      const d = await res.json()
      return (d.conversations ?? []) as ConversationWithDetails[]
    },
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (conversationsData) setConversations(conversationsData)
  }, [conversationsData, setConversations])

  const conversation = conversationsData?.find((c) => c.id === conversationId)
  const otherParticipant: (Profile & { last_seen?: string | null }) | undefined =
    conversation?.participants?.find((p) => p.user_id !== currentUser?.id)?.profile

  const online = otherParticipant ? isUserOnline(otherParticipant.id) : false

  // Typing: is the other user currently typing in this conversation?
  const otherIsTyping = otherParticipant
    ? allTypingUsers.some(
        (t) => t.conversationId === conversationId && t.userId === otherParticipant.id
      )
    : false

  const [showNewMessage, setShowNewMessage] = useState(false)

  return (
    <>
    <div className="flex h-[calc(100dvh-5rem)] md:h-[calc(100vh-6rem)] rounded-2xl border border-border bg-card overflow-hidden">
      {/* Sidebar on large screens */}
      <div className="hidden lg:flex flex-col w-72 border-r border-border shrink-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold">Messages</h2>
          <Button variant="ghost" size="icon-sm" onClick={() => setShowNewMessage(true)} title="New Message">
            <FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <ConversationList />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => router.back()}>
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          </Button>
          {otherParticipant && (
            <>
              <Link href={`/profile/${otherParticipant.username}`}>
                <UserAvatar user={otherParticipant} size="sm" showOnline />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${otherParticipant.username}`}>
                  <p className="text-sm font-semibold hover:underline truncate">
                    {otherParticipant.full_name || otherParticipant.username}
                  </p>
                </Link>
                {otherIsTyping ? (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <span className="relative flex gap-0.5 items-end h-3">
                      <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                    </span>
                    typing...
                  </p>
                ) : (
                  <p className={cn('text-xs flex items-center gap-1', online ? 'text-emerald-500' : 'text-muted-foreground')}>
                    <FontAwesomeIcon icon={faCircle} className="h-1.5 w-1.5" />
                    {online ? 'Online' : formatLastSeen(otherParticipant.last_seen)}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0">
          <MessageThread conversationId={conversationId} />
        </div>
      </div>
    </div>
    <AnimatePresence>
      {showNewMessage && <NewMessageModal onClose={() => setShowNewMessage(false)} />}
    </AnimatePresence>
    </>
  )
}
