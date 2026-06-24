'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
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
import { faDownload, faPlay, faReply, faRotateRight, faCheck } from '@fortawesome/free-solid-svg-icons'
import { useUIStore } from '@/store/uiStore'
import { motion, AnimatePresence } from 'framer-motion'
import type { MessageWithSender } from '@/types/database'

interface MessageThreadProps {
  conversationId: string
}

const EMPTY_MESSAGES: MessageWithSender[] = []

// Linkify URLs in text content
function renderText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function SeenTick({ isSeen, isMine }: { isSeen: boolean; isMine: boolean }) {
  if (!isMine) return null
  if (isSeen) {
    return (
      <span className="inline-flex items-center ml-1 text-blue-400" title="Seen">
        <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
        <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5 -ml-1" />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center ml-1 text-white/50" title="Sent">
      <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
    </span>
  )
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const user = useAuthStore((s) => s.user)
  const conversationMessages = useChatStore((s) => s.messages[conversationId]) ?? EMPTY_MESSAGES
  const setMessages = useChatStore((s) => s.setMessages)
  const openMediaViewer = useUIStore((s) => s.openMediaViewer)
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [replyTo, setReplyTo] = useState<{ id: string; content: string | null; senderName: string } | null>(null)
  const [recipientLastReadAt, setRecipientLastReadAt] = useState<string | null>(null)
  const isNearBottomRef = useRef(true)
  const mountTimeRef = useRef(Date.now())
  const { ref: topRef, inView: topInView } = useInView()

  const {
    data,
    dataUpdatedAt,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/messages/${conversationId}?cursor=${pageParam || ''}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `${res.status}`)
      }
      return res.json()
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  useEffect(() => {
    mountTimeRef.current = Date.now()
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
  }, [conversationId, queryClient])

  // Seed store from query data and capture recipient's last_read_at
  useEffect(() => {
    if (!data?.pages) return
    if (dataUpdatedAt < mountTimeRef.current) return

    const fetched: MessageWithSender[] = data.pages.flatMap((p) => p.messages)
    const fetchedIds = new Set(fetched.map((m) => m.id))

    const current = useChatStore.getState().messages[conversationId] ?? []
    const socketOnly = current.filter((m) => !fetchedIds.has(m.id))

    const merged = [...fetched, ...socketOnly].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    setMessages(conversationId, merged)

    // Capture recipientLastReadAt from first page (most recent fetch)
    const firstPage = data.pages[0]
    if (firstPage?.recipientLastReadAt) {
      setRecipientLastReadAt((prev) => {
        if (!prev || new Date(firstPage.recipientLastReadAt) > new Date(prev)) {
          return firstPage.recipientLastReadAt
        }
        return prev
      })
    }
  }, [data, dataUpdatedAt, conversationId, setMessages])

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150
  }, [])

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: conversationMessages.length <= 50 ? 'instant' : 'smooth' })
    }
  }, [conversationMessages.length])

  useEffect(() => {
    if (!isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      isNearBottomRef.current = true
    }
  }, [isLoading])

  // Join conversation room; listen for messages:read socket event
  useEffect(() => {
    if (!user) return
    const socket = getSocket(user.id)
    socket.emit('conversation:join', conversationId)

    const onReconnect = () => socket.emit('conversation:join', conversationId)
    socket.on('connect', onReconnect)

    // When the recipient reads messages, update the "seen" tick
    const onRead = (payload: { conversationId: string; userId: string; readAt: string }) => {
      if (payload.conversationId !== conversationId || payload.userId === user.id) return
      setRecipientLastReadAt((prev) => {
        if (!prev || new Date(payload.readAt) > new Date(prev)) return payload.readAt
        return prev
      })
    }
    socket.on('messages:read', onRead)

    return () => {
      socket.emit('conversation:leave', conversationId)
      socket.off('connect', onReconnect)
      socket.off('messages:read', onRead)
    }
  }, [conversationId, user])

  useEffect(() => {
    if (topInView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [topInView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const renderMessage = (msg: MessageWithSender, idx: number) => {
    const isMine = msg.sender_id === user?.id
    const sender = msg.sender
    const prevMsg = conversationMessages[idx - 1]
    const showAvatar = !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id)
    const showTimestamp =
      !prevMsg ||
      new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000

    // A message is "seen" if the recipient's last_read_at is after this message's created_at
    const isSeen =
      isMine &&
      !!recipientLastReadAt &&
      new Date(recipientLastReadAt) >= new Date(msg.created_at)

    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        {showTimestamp && (
          <div className="flex justify-center my-3">
            <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-3 py-0.5">
              {formatMessageTime(msg.created_at)}
            </span>
          </div>
        )}

        <div className={cn('flex gap-2 group', isMine ? 'flex-row-reverse' : 'flex-row', 'mb-0.5')}>
          <div className="w-7 shrink-0">
            {showAvatar && !isMine && sender && (
              <UserAvatar user={sender} size="xs" className="mt-auto" />
            )}
          </div>

          <div className={cn('max-w-[72%] space-y-0.5', isMine && 'items-end flex flex-col')}>
            {msg.reply_to && (
              <div
                className={cn(
                  'rounded-xl border-l-4 bg-muted/60 px-2.5 py-1.5 text-xs opacity-80 mb-0.5',
                  isMine ? 'border-l-indigo-400' : 'border-l-primary'
                )}
              >
                <p className="font-semibold text-primary/80">
                  {(msg.reply_to as MessageWithSender).sender?.username ?? 'Unknown'}
                </p>
                <p className="truncate text-muted-foreground">{msg.reply_to.content || '[media]'}</p>
              </div>
            )}

            <div
              className={cn(
                'rounded-2xl px-3.5 py-2 text-sm break-words',
                isMine
                  ? 'rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-500 text-white'
                  : 'rounded-tl-sm bg-muted text-foreground'
              )}
            >
              {msg.type === 'text' && (
                <p className="whitespace-pre-wrap leading-relaxed">{renderText(msg.content ?? '')}</p>
              )}

              {msg.type === 'image' && msg.media_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={msg.media_url}
                  alt="Image"
                  className="rounded-xl max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: 280 }}
                  onClick={() => openMediaViewer(msg.media_url!)}
                />
              )}

              {msg.type === 'video' && msg.media_url && (
                <video src={msg.media_url} controls className="rounded-xl max-w-full" style={{ maxHeight: 280 }} />
              )}

              {msg.type === 'audio' && msg.media_url && (
                <div className="flex items-center gap-2 min-w-[180px]">
                  <button className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faPlay} className="h-3 w-3" />
                  </button>
                  <audio src={msg.media_url} controls className="flex-1 h-6" />
                  {msg.duration_seconds ? (
                    <span className="text-xs opacity-75 shrink-0">{secondsToTime(msg.duration_seconds)}</span>
                  ) : null}
                </div>
              )}

              {msg.type === 'file' && msg.media_url && (
                <a
                  href={msg.media_url}
                  download={msg.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs truncate max-w-40">{msg.file_name}</p>
                    {msg.file_size && <p className="text-[10px] opacity-70">{bytesToHuman(msg.file_size)}</p>}
                  </div>
                </a>
              )}

              {/* Time + seen tick inline on my messages */}
              {isMine && (
                <div className="flex items-center justify-end gap-0.5 mt-0.5">
                  <span className="text-[10px] text-white/60 leading-none">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <SeenTick isSeen={isSeen} isMine={isMine} />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() =>
              setReplyTo({ id: msg.id, content: msg.content, senderName: sender?.username ?? 'You' })
            }
            className={cn(
              'opacity-0 group-hover:opacity-100 self-end mb-1 text-muted-foreground hover:text-foreground transition-all',
              isMine ? 'mr-1' : 'ml-1'
            )}
            title="Reply"
          >
            <FontAwesomeIcon icon={faReply} className={cn('h-3.5 w-3.5', isMine && 'scale-x-[-1]')} />
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 scroll-smooth"
      >
        <div ref={topRef} className="h-1" />
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <LoadingSpinner size="sm" />
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <p className="text-sm font-medium">Could not load messages</p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <FontAwesomeIcon icon={faRotateRight} className="h-3 w-3" />
              Try again
            </button>
          </div>
        ) : conversationMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1 opacity-60">Say hello</p>
          </div>
        ) : (
          conversationMessages.map((msg, idx) => renderMessage(msg, idx))
        )}

        <TypingIndicator conversationId={conversationId} />
        <div ref={bottomRef} className="h-1" />
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-xl border-l-4 border-l-primary bg-muted/50 px-3 py-2 mb-2 overflow-hidden"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary">{replyTo.senderName}</p>
                <p className="text-xs text-muted-foreground truncate">{replyTo.content || '[media]'}</p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-muted-foreground hover:text-foreground text-xs shrink-0"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <MessageInput
          conversationId={conversationId}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  )
}
