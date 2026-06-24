'use client'
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPhone, faPhoneSlash, faVideo } from '@fortawesome/free-solid-svg-icons'
import { useCallStore } from '@/store/callStore'
import { getSocket } from '@/lib/socket/client'
import { useAuthStore } from '@/store/authStore'

function startRingtone(ctx: AudioContext): () => void {
  let active = true
  const ring = () => {
    if (!active) return
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = i === 0 ? 880 : 660
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0.12, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
      osc.start(t)
      osc.stop(t + 0.15)
    }
    if (active) setTimeout(ring, 3000)
  }
  ring()
  return () => { active = false }
}

export function IncomingCallModal() {
  const incomingCall = useCallStore((s) => s.incomingCall)
  const setIncomingCall = useCallStore((s) => s.setIncomingCall)
  const setActiveCall = useCallStore((s) => s.setActiveCall)
  const userId = useAuthStore((s) => s.user?.id)
  const stopRef = useRef<(() => void) | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!incomingCall) return
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      ctxRef.current = ctx
      stopRef.current = startRingtone(ctx)
    } catch {}
    return () => {
      stopRef.current?.()
      ctxRef.current?.close().catch(() => {})
    }
  }, [incomingCall?.conversationId])

  if (!incomingCall || !userId) return null

  const socket = getSocket(userId)

  const accept = () => {
    stopRef.current?.()
    socket.emit('call:accept', { conversationId: incomingCall.conversationId })
    socket.emit('conversation:join', incomingCall.conversationId)
    setActiveCall({
      conversationId: incomingCall.conversationId,
      type: incomingCall.type,
      direction: 'inbound',
      status: 'connecting',
      startedAt: null,
      otherUserId: incomingCall.callerId,
      otherUserName: incomingCall.callerName,
      otherUserAvatar: incomingCall.callerAvatar,
    })
    setIncomingCall(null)
  }

  const reject = () => {
    stopRef.current?.()
    socket.emit('call:reject', { conversationId: incomingCall.conversationId, callerId: incomingCall.callerId })
    setIncomingCall(null)
  }

  const isVideo = incomingCall.type === 'video'

  return (
    <AnimatePresence>
      <motion.div
        key="incoming-call"
        initial={{ opacity: 0, y: -16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.95 }}
        className="fixed top-4 right-4 z-[200] w-72 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-b from-primary/15 to-transparent px-4 pt-4 pb-3 flex flex-col items-center gap-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Incoming {isVideo ? 'Video' : 'Audio'} Call
          </p>
          {/* Avatar */}
          <div className="relative h-16 w-16">
            {incomingCall.callerAvatar ? (
              <img
                src={incomingCall.callerAvatar}
                alt={incomingCall.callerName}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                {incomingCall.callerName[0]?.toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow">
              <FontAwesomeIcon
                icon={isVideo ? faVideo : faPhone}
                className="h-3 w-3 text-primary-foreground"
              />
            </span>
          </div>
          <p className="font-semibold text-sm">{incomingCall.callerName}</p>
        </div>

        {/* Actions */}
        <div className="flex border-t border-border">
          <button
            onClick={reject}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <FontAwesomeIcon icon={faPhoneSlash} className="h-4 w-4" />
            Decline
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={accept}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm text-emerald-500 hover:bg-emerald-500/10 transition-colors font-medium"
          >
            <FontAwesomeIcon icon={faPhone} className="h-4 w-4" />
            Accept
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
