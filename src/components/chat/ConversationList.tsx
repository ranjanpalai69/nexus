'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { formatMessageTime } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import type { ConversationWithDetails, Profile } from '@/types/database'

type TickState = 'sent' | 'delivered' | 'seen'

function ConvTick({ state, active }: { state: TickState; active: boolean }) {
  const base = active ? 'text-primary-foreground/70' : ''
  if (state === 'seen') {
    return (
      <span className="inline-flex items-center shrink-0" title="Seen">
        <FontAwesomeIcon icon={faCheck} className={cn('h-2.5 w-2.5', active ? 'text-primary-foreground/70' : 'text-blue-500')} />
        <FontAwesomeIcon icon={faCheck} className={cn('h-2.5 w-2.5 -ml-[5px]', active ? 'text-primary-foreground/70' : 'text-blue-500')} />
      </span>
    )
  }
  if (state === 'delivered') {
    return (
      <span className="inline-flex items-center shrink-0" title="Delivered">
        <FontAwesomeIcon icon={faCheck} className={cn('h-2.5 w-2.5', base || 'text-muted-foreground')} />
        <FontAwesomeIcon icon={faCheck} className={cn('h-2.5 w-2.5 -ml-[5px]', base || 'text-muted-foreground')} />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center shrink-0" title="Sent">
      <FontAwesomeIcon icon={faCheck} className={cn('h-2.5 w-2.5', base || 'text-muted-foreground')} />
    </span>
  )
}

export function ConversationList() {
  const pathname = usePathname()
  const currentUser = useAuthStore((s) => s.user)
  const conversations = useChatStore((s) => s.conversations)
  const setConversations = useChatStore((s) => s.setConversations)
  const isUserOnline = useChatStore((s) => s.isUserOnline)

  const { isLoading, data } = useQuery<ConversationWithDetails[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/messages')
      const result = await res.json()
      return (result.conversations ?? []) as ConversationWithDetails[]
    },
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (data) setConversations(data)
  }, [data, setConversations])

  if (isLoading) return <PageLoader />

  const getOtherParticipant = (conv: ConversationWithDetails): Profile | undefined =>
    conv.participants?.find((p) => p.user_id !== currentUser?.id)?.profile

  return (
    <div className="space-y-1">
      {conversations.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">No conversations yet</div>
      )}
      {conversations.map((conv) => {
        const other = getOtherParticipant(conv)
        if (!other) return null
        const isActive = pathname === `/messages/${conv.id}`

        // Tick state for MY last message in this conversation
        const lastSenderId = (conv as unknown as Record<string, unknown>).last_message_sender_id as string | undefined
        const isMyLastMsg = lastSenderId === currentUser?.id
        const theirParticipant = conv.participants?.find((p) => p.user_id !== currentUser?.id)
        const theirLastReadAt = (theirParticipant as unknown as Record<string, unknown>)?.last_read_at as string | null | undefined

        let tickState: TickState = 'sent'
        if (isMyLastMsg && conv.last_message_at) {
          if (theirLastReadAt && new Date(theirLastReadAt) >= new Date(conv.last_message_at)) {
            tickState = 'seen'
          } else if (isUserOnline(other.id)) {
            tickState = 'delivered'
          }
        }

        return (
          <Link
            key={conv.id}
            href={`/messages/${conv.id}`}
            className={cn(
              'flex items-center gap-3 rounded-xl p-3 transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
          >
            <UserAvatar user={other} size="md" showOnline />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold truncate">{other.full_name || other.username}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {isMyLastMsg && <ConvTick state={tickState} active={isActive} />}
                  {conv.last_message_at && (
                    <span className={cn('text-[10px]', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {formatMessageTime(conv.last_message_at)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className={cn('text-xs truncate', isActive ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {conv.last_message_preview || 'No messages yet'}
                </p>
                {(conv.unread_count ?? 0) > 0 && !isActive && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground font-bold shrink-0">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
