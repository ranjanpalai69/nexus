'use client'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'

export function TypingIndicator({ conversationId }: { conversationId: string }) {
  const currentUser = useAuthStore((s) => s.user)
  const typingUsers = useChatStore((s) =>
    s.typingUsers.filter((t) => t.conversationId === conversationId && t.userId !== currentUser?.id)
  )

  if (typingUsers.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-2">
      <div className="flex items-center gap-1 rounded-2xl bg-muted px-3 py-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">typing...</span>
    </div>
  )
}
