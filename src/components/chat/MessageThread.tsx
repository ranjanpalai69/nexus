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
import { formatMessageTime, bytesToHuman } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDownload, faReply, faRotateRight, faCheck, faPlay, faPause,
} from '@fortawesome/free-solid-svg-icons'
import { useUIStore } from '@/store/uiStore'
import { motion, AnimatePresence } from 'framer-motion'
import type { MessageWithSender } from '@/types/database'

interface MessageThreadProps {
  conversationId: string
  otherUserId?: string
}

const EMPTY_MESSAGES: MessageWithSender[] = []

// ── Helpers ─────────────────────────────────────────────────────────────────

function secondsFmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function renderText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all">
        {part}
      </a>
    ) : <span key={i}>{part}</span>
  )
}

// ── Custom Audio Player ──────────────────────────────────────────────────────

function AudioPlayer({ src, duration: propDuration, isMine }: { src: string; duration?: number; isMine: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(propDuration ?? 0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); setPlaying(false) }
    else { el.play().catch(() => {}); setPlaying(true) }
  }

  const handleLoadedMetadata = () => {
    const d = audioRef.current?.duration
    if (d && isFinite(d) && d > 0) setTotalDuration(d)
  }
  const handleTimeUpdate = () => setCurrentTime(audioRef.current?.currentTime ?? 0)
  const handleEnded = () => { setPlaying(false); setCurrentTime(0) }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
  }

  const pct = totalDuration > 0 ? Math.min((currentTime / totalDuration) * 100, 100) : 0

  return (
    <div className="flex items-center gap-3 min-w-[220px] max-w-[280px]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95',
          isMine ? 'bg-white/25 hover:bg-white/35' : 'bg-primary/20 hover:bg-primary/30'
        )}
      >
        <FontAwesomeIcon icon={playing ? faPause : faPlay} className="h-3.5 w-3.5" />
      </button>

      <div className="flex-1 space-y-1 min-w-0">
        {/* Progress bar */}
        <div className="relative h-1.5 rounded-full overflow-hidden"
          style={{ background: isMine ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)' }}>
          <div
            className={cn('absolute left-0 top-0 h-full rounded-full transition-[width]', isMine ? 'bg-white' : 'bg-primary')}
            style={{ width: `${pct}%` }}
          />
          <input
            type="range" min={0} max={totalDuration || 1} step={0.05} value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        {/* Time */}
        <div className="flex justify-between">
          <span className={cn('text-[10px] font-mono', isMine ? 'text-white/70' : 'text-muted-foreground')}>
            {secondsFmt(currentTime)}
          </span>
          <span className={cn('text-[10px] font-mono', isMine ? 'text-white/70' : 'text-muted-foreground')}>
            {totalDuration > 0 ? secondsFmt(totalDuration) : '--:--'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Tick ─────────────────────────────────────────────────────────────────────
// single black  = sent (saved to DB)
// double black  = delivered (recipient is online)
// double blue   = seen (recipientLastReadAt >= message.created_at)

type TickState = 'sent' | 'delivered' | 'seen'

function MessageTick({ state }: { state: TickState }) {
  if (state === 'seen') {
    return (
      <span className="inline-flex items-center ml-1" title="Seen">
        <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5 text-blue-400" />
        <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5 text-blue-400 -ml-[5px]" />
      </span>
    )
  }
  if (state === 'delivered') {
    return (
      <span className="inline-flex items-center ml-1" title="Delivered">
        <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5 text-white/60" />
        <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5 text-white/60 -ml-[5px]" />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center ml-1" title="Sent">
      <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5 text-white/40" />
    </span>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function MessageThread({ conversationId, otherUserId }: MessageThreadProps) {
  const user = useAuthStore((s) => s.user)
  const conversationMessages = useChatStore((s) => s.messages[conversationId]) ?? EMPTY_MESSAGES
  const setMessages = useChatStore((s) => s.setMessages)
  const isUserOnline = useChatStore((s) => s.isUserOnline)
  const openMediaViewer = useUIStore((s) => s.openMediaViewer)
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [replyTo, setReplyTo] = useState<{ id: string; content: string | null; senderName: string } | null>(null)
  const [recipientLastReadAt, setRecipientLastReadAt] = useState<string | null>(null)
  const isNearBottomRef = useRef(true)
  const mountTimeRef = useRef(Date.now())
  const { ref: topRef, inView: topInView } = useInView()

  const isOtherOnline = otherUserId ? isUserOnline(otherUserId) : false

  const { data, dataUpdatedAt, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery({
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

    const firstPage = data.pages[0]
    if (firstPage?.recipientLastReadAt) {
      setRecipientLastReadAt((prev) =>
        !prev || new Date(firstPage.recipientLastReadAt) > new Date(prev)
          ? firstPage.recipientLastReadAt
          : prev
      )
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

  useEffect(() => {
    if (!user) return
    const socket = getSocket(user.id)
    socket.emit('conversation:join', conversationId)

    const onReconnect = () => socket.emit('conversation:join', conversationId)
    socket.on('connect', onReconnect)

    // Track the other participant's latest read time (for ticks)
    const onRead = (payload: { conversationId: string; userId: string; readAt: string }) => {
      if (payload.conversationId !== conversationId || payload.userId === user.id) return
      setRecipientLastReadAt((prev) =>
        !prev || new Date(payload.readAt) > new Date(prev) ? payload.readAt : prev
      )
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

  const getTickState = (msg: MessageWithSender): TickState => {
    if (!user || msg.sender_id !== user.id) return 'sent'
    if (recipientLastReadAt && new Date(recipientLastReadAt) >= new Date(msg.created_at)) return 'seen'
    if (isOtherOnline) return 'delivered'
    return 'sent'
  }

  const renderMessage = (msg: MessageWithSender, idx: number) => {
    const isMine = msg.sender_id === user?.id
    const sender = msg.sender
    const prevMsg = conversationMessages[idx - 1]
    const showAvatar = !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id)
    const showTimestamp =
      !prevMsg || new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000

    const tickState = isMine ? getTickState(msg) : null

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

          <div className={cn('max-w-[75%] space-y-0.5', isMine && 'items-end flex flex-col')}>
            {msg.reply_to && (
              <div className={cn(
                'rounded-xl border-l-4 bg-muted/60 px-2.5 py-1.5 text-xs opacity-80 mb-0.5',
                isMine ? 'border-l-indigo-400' : 'border-l-primary'
              )}>
                <p className="font-semibold text-primary/80">
                  {(msg.reply_to as MessageWithSender).sender?.username ?? 'Unknown'}
                </p>
                <p className="truncate text-muted-foreground">{msg.reply_to.content || '[media]'}</p>
              </div>
            )}

            <div className={cn(
              'rounded-2xl px-3.5 py-2 text-sm break-words',
              isMine
                ? 'rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-500 text-white'
                : 'rounded-tl-sm bg-muted text-foreground'
            )}>
              {/* Text */}
              {msg.type === 'text' && (
                <p className="whitespace-pre-wrap leading-relaxed">{renderText(msg.content ?? '')}</p>
              )}

              {/* Image */}
              {msg.type === 'image' && msg.media_url && (
                <img
                  src={msg.media_url}
                  alt="Image"
                  className="rounded-xl max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: 280 }}
                  onClick={() => openMediaViewer(msg.media_url!)}
                />
              )}

              {/* Video */}
              {msg.type === 'video' && msg.media_url && (
                <video src={msg.media_url} controls className="rounded-xl max-w-full" style={{ maxHeight: 280 }} />
              )}

              {/* Audio */}
              {msg.type === 'audio' && msg.media_url && (
                <AudioPlayer src={msg.media_url} duration={msg.duration_seconds ?? undefined} isMine={isMine} />
              )}

              {/* File */}
              {msg.type === 'file' && msg.media_url && (
                <a
                  href={msg.media_url}
                  download={msg.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                    isMine ? 'bg-white/20' : 'bg-primary/15'
                  )}>
                    <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs truncate max-w-40">{msg.file_name}</p>
                    {msg.file_size && <p className="text-[10px] opacity-70">{bytesToHuman(msg.file_size)}</p>}
                  </div>
                </a>
              )}

              {/* Time + tick on my messages (inlined below content) */}
              {isMine && (
                <div className="flex items-center justify-end gap-0.5 mt-1">
                  <span className="text-[10px] text-white/60 leading-none">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {tickState && <MessageTick state={tickState} />}
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
          <div className="flex justify-center py-2"><LoadingSpinner size="sm" /></div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <p className="text-sm font-medium">Could not load messages</p>
            <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs text-primary">
              <FontAwesomeIcon icon={faRotateRight} className="h-3 w-3" /> Try again
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
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground text-xs shrink-0">✕</button>
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
