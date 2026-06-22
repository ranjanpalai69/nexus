'use client'
import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { getSocket } from '@/lib/socket/client'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatMessageTime, bytesToHuman, secondsToTime } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faPlay } from '@fortawesome/free-solid-svg-icons'
import { useUIStore } from '@/store/uiStore'
import type { MessageWithSender } from '@/types/database'

interface MessageThreadProps {
  conversationId: string
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const user = useAuthStore((s) => s.user)
  const { messages, setMessages } = useChatStore()
  const { openMediaViewer } = useUIStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [replyTo, setReplyTo] = useState<{ id: string; content: string | null; senderName: string } | null>(null)
  const { ref: topRef, inView: topInView } = useInView()

  const conversationMessages = messages[conversationId] ?? []

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/messages/${conversationId}?cursor=${pageParam || ''}`)
      const data = await res.json()
      return data
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  useEffect(() => {
    if (data) {
      const all: MessageWithSender[] = data.pages.flatMap((p) => p.messages)
      setMessages(conversationId, all)
    }
  }, [data, conversationId, setMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages.length])

  useEffect(() => {
    if (!user) return
    const socket = getSocket(user.id)
    socket.emit('conversation:join', conversationId)
    return () => { socket.emit('conversation:leave', conversationId) }
  }, [conversationId, user])

  useEffect(() => {
    if (topInView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [topInView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const renderMessage = (msg: MessageWithSender) => {
    const isMine = msg.sender_id === user?.id
    const sender = msg.sender

    return (
      <div key={msg.id} className={cn('flex gap-2 group', isMine && 'flex-row-reverse')}>
        {!isMine && sender && <UserAvatar user={sender} size="xs" className="mt-auto mb-1 shrink-0" />}
        <div className={cn('max-w-[70%] space-y-1', isMine && 'items-end flex flex-col')}>
          {msg.reply_to && (
            <div className={cn('rounded-lg border-l-4 bg-muted/50 px-2 py-1 text-xs opacity-80', isMine ? 'border-l-primary-foreground' : 'border-l-primary')}>
              <p className="font-semibold">{(msg.reply_to as MessageWithSender).sender?.username}</p>
              <p className="truncate">{msg.reply_to.content || '[media]'}</p>
            </div>
          )}
          <div
            className={cn(
              'rounded-2xl px-3 py-2 text-sm',
              isMine
                ? 'rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-500 text-white'
                : 'rounded-tl-sm bg-muted text-foreground'
            )}
          >
            {msg.type === 'text' && <p className="whitespace-pre-wrap">{msg.content}</p>}

            {(msg.type === 'image') && msg.media_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={msg.media_url}
                alt="Image"
                className="rounded-xl max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxHeight: 300 }}
                onClick={() => openMediaViewer(msg.media_url!)}
              />
            )}

            {msg.type === 'video' && msg.media_url && (
              <video src={msg.media_url} controls className="rounded-xl max-w-full" style={{ maxHeight: 300 }} />
            )}

            {msg.type === 'audio' && msg.media_url && (
              <div className="flex items-center gap-2 min-w-[200px]">
                <button className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={faPlay} className="h-3 w-3" />
                </button>
                <audio src={msg.media_url} controls className="flex-1 h-6" />
                <span className="text-xs opacity-75">{msg.duration_seconds ? secondsToTime(msg.duration_seconds) : ''}</span>
              </div>
            )}

            {msg.type === 'file' && msg.media_url && (
              <a href={msg.media_url} download={msg.file_name} className="flex items-center gap-2 hover:opacity-80">
                <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
                <div>
                  <p className="font-medium text-xs truncate max-w-40">{msg.file_name}</p>
                  {msg.file_size && <p className="text-[10px] opacity-70">{bytesToHuman(msg.file_size)}</p>}
                </div>
              </a>
            )}
          </div>
          <div className={cn('flex items-center gap-1', isMine && 'justify-end')}>
            <span className="text-[10px] text-muted-foreground">{formatMessageTime(msg.created_at)}</span>
          </div>
        </div>
        {!isMine && (
          <button
            onClick={() => setReplyTo({ id: msg.id, content: msg.content, senderName: sender?.username ?? '' })}
            className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-foreground transition-opacity mt-auto mb-2"
          >
            Reply
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div ref={topRef} />
        {isFetchingNextPage && <div className="flex justify-center"><LoadingSpinner size="sm" /></div>}
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          conversationMessages.map(renderMessage)
        )}
        <TypingIndicator conversationId={conversationId} />
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <MessageInput
          conversationId={conversationId}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  )
}
