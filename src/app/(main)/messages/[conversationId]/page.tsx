'use client'
import { use, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { MessageThread } from '@/components/chat/MessageThread'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faCircle } from '@fortawesome/free-solid-svg-icons'
import { useChatStore } from '@/store/chatStore'
import { ConversationList } from '@/components/chat/ConversationList'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import type { Profile } from '@/types/database'

export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params)
  const currentUser = useAuthStore((s) => s.user)
  const { isUserOnline, setActiveConversation, clearConversationUnread } = useChatStore()
  const router = useRouter()

  useEffect(() => {
    setActiveConversation(conversationId)
    clearConversationUnread(conversationId)
    return () => setActiveConversation(null)
  }, [conversationId, setActiveConversation, clearConversationUnread])

  const { data } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const res = await fetch('/api/messages')
      const d = await res.json()
      return d.conversations?.find((c: { id: string }) => c.id === conversationId)
    },
  })

  const otherParticipant: Profile | undefined = data?.participants
    ?.find((p: { user_id: string }) => p.user_id !== currentUser?.id)?.profile

  const online = otherParticipant ? isUserOnline(otherParticipant.id) : false

  return (
    <div className="flex h-[calc(100dvh-5rem)] md:h-[calc(100vh-6rem)] rounded-2xl border border-border bg-card overflow-hidden">
      {/* Sidebar on large screens */}
      <div className="hidden lg:flex flex-col w-72 border-r border-border shrink-0">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold">Messages</h2>
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
                <p className={cn('text-xs flex items-center gap-1', online ? 'text-emerald-500' : 'text-muted-foreground')}>
                  <FontAwesomeIcon icon={faCircle} className="h-1.5 w-1.5" />
                  {online ? 'Online' : 'Offline'}
                </p>
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
  )
}
