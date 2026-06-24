'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { formatMessageTime } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import type { ConversationWithDetails, Profile } from '@/types/database'

export function ConversationList() {
  const pathname = usePathname()
  const currentUser = useAuthStore((s) => s.user)
  const { conversations, setConversations } = useChatStore()

  const { isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/messages')
      const data = await res.json()
      const convs = data.conversations ?? []
      setConversations(convs)
      return convs
    },
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  })

  if (isLoading) return <PageLoader />

  const getOtherParticipant = (conv: ConversationWithDetails): Profile | undefined => {
    return conv.participants?.find((p) => p.user_id !== currentUser?.id)?.profile
  }

  return (
    <div className="space-y-1">
      {conversations.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">No conversations yet</div>
      )}
      {conversations.map((conv) => {
        const other = getOtherParticipant(conv)
        if (!other) return null
        const isActive = pathname === `/messages/${conv.id}`

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
                {conv.last_message_at && (
                  <span className={cn('text-[10px] shrink-0', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {formatMessageTime(conv.last_message_at)}
                  </span>
                )}
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
