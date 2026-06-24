'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMicrophone, faMicrophoneSlash,
  faVideo, faVideoSlash, faPhoneSlash,
} from '@fortawesome/free-solid-svg-icons'
import { useCallStore } from '@/store/callStore'
import type { ActiveCall } from '@/store/callStore'
import { getSocket } from '@/lib/socket/client'
import { useAuthStore } from '@/store/authStore'
import { subscribeCallEvents, resetCallEvents } from '@/lib/callEvents'
import toast from 'react-hot-toast'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

function fmt(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

function playDeclineSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioCtx()
    ;[0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440 - offset * 80, ctx.currentTime + offset)
      gain.gain.setValueAtTime(0.15, ctx.currentTime + offset)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.18)
      osc.start(ctx.currentTime + offset)
      osc.stop(ctx.currentTime + offset + 0.18)
    })
    setTimeout(() => ctx.close(), 700)
  } catch {}
}

export function CallOverlay() {
  const activeCall = useCallStore((s) => s.activeCall)
  const setActiveCall = useCallStore((s) => s.setActiveCall)
  const updateActiveCall = useCallStore((s) => s.updateActiveCall)
  const userId = useAuthStore((s) => s.user?.id)

  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [statusText, setStatusText] = useState('Calling...')

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const callRef = useRef<ActiveCall | null>(null)
  callRef.current = activeCall

  // Buffers for events that arrive before the PeerConnection is ready
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const pendingAcceptRef = useRef(false)

  const cleanupRefs = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current = null
  }, [])

  const hangUp = useCallback(() => {
    const call = callRef.current
    if (!call || !userId) return
    const socket = getSocket(userId)
    if (!call.startedAt) {
      socket.emit('call:cancel', { conversationId: call.conversationId, calleeId: call.otherUserId })
    } else {
      const duration = Math.floor((Date.now() - call.startedAt) / 1000)
      socket.emit('call:end', { conversationId: call.conversationId, duration, type: call.type })
    }
    cleanupRefs()
    setActiveCall(null)
  }, [userId, setActiveCall, cleanupRefs])

  // ── Main effect ────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeCall || !userId) return

    const { conversationId, direction, type } = activeCall
    const socket = getSocket(userId)
    let dead = false

    // ── WebRTC helpers ─────────────────────────────────────────────
    const createAndSendOffer = async (pc: RTCPeerConnection) => {
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('call:offer', { conversationId, sdp: offer })
      } catch (err) {
        console.error('[call] createOffer failed', err)
      }
    }

    const processOffer = async (pc: RTCPeerConnection, sdp: RTCSessionDescriptionInit) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('call:answer', { conversationId, sdp: answer })
      } catch (err) {
        console.error('[call] processOffer failed', err)
      }
    }

    const flushCandidates = async (pc: RTCPeerConnection) => {
      const pending = [...pendingCandidatesRef.current]
      pendingCandidatesRef.current = []
      for (const c of pending) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
      }
    }

    // ── Init (async) ───────────────────────────────────────────────
    const init = async () => {
      let localStream: MediaStream
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        })
      } catch {
        setStatusText('Camera/mic access denied')
        return
      }
      if (dead) { localStream.getTracks().forEach((t) => t.stop()); return }

      localStreamRef.current = localStream
      if (type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc

      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream))

      pc.ontrack = (e) => {
        if (dead) return
        const stream = e.streams[0]
        if (type === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        } else if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream
        }
        updateActiveCall({ status: 'connected', startedAt: Date.now() })
        setStatusText('')
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('call:ice-candidate', { conversationId, candidate: e.candidate.toJSON() })
        }
      }

      pc.onconnectionstatechange = () => {
        if ((pc.connectionState === 'failed' || pc.connectionState === 'disconnected') && !dead) {
          hangUp()
        }
      }

      // Drain any events queued before PC was ready
      if (direction === 'inbound' && pendingOfferRef.current) {
        await processOffer(pc, pendingOfferRef.current)
        pendingOfferRef.current = null
      }
      if (direction === 'outbound' && pendingAcceptRef.current) {
        pendingAcceptRef.current = false
        await createAndSendOffer(pc)
      }
      await flushCandidates(pc)
    }

    init()

    // ── Subscribe to the call event bus ───────────────────────────
    // subscribeCallEvents drains events buffered while this component wasn't mounted yet.
    const unsubscribe = subscribeCallEvents(async (type: string, data: any) => {
      if (dead) return

      switch (type) {
        case 'accept': {
          if (direction !== 'outbound') return
          setStatusText('Connecting...')
          if (!pcRef.current) { pendingAcceptRef.current = true; return }
          await createAndSendOffer(pcRef.current)
          break
        }

        case 'offer': {
          if (direction !== 'inbound') return
          const { sdp } = data as { sdp: RTCSessionDescriptionInit }
          if (!pcRef.current) { pendingOfferRef.current = sdp; return }
          await processOffer(pcRef.current, sdp)
          break
        }

        case 'answer': {
          if (!pcRef.current) return
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
          } catch (err) {
            console.error('[call] setRemoteDescription (answer) failed', err)
          }
          break
        }

        case 'ice': {
          const { candidate } = data as { candidate: RTCIceCandidateInit }
          if (!pcRef.current) { pendingCandidatesRef.current.push(candidate); return }
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
          break
        }

        case 'end': {
          dead = true
          cleanupRefs()
          setActiveCall(null)
          break
        }

        case 'reject': {
          dead = true
          playDeclineSound()
          cleanupRefs()
          setActiveCall(null)
          toast('Call declined', { icon: '📵', duration: 3000, position: 'top-center' })
          break
        }

        case 'busy': {
          dead = true
          playDeclineSound()
          cleanupRefs()
          setActiveCall(null)
          toast('User is in another call', { icon: '📵', duration: 3000, position: 'top-center' })
          break
        }
      }
    })

    return () => {
      dead = true
      pendingOfferRef.current = null
      pendingCandidatesRef.current = []
      pendingAcceptRef.current = false
      unsubscribe()
      resetCallEvents()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      pcRef.current?.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.conversationId, activeCall?.direction, activeCall?.type, userId])

  // ── Duration timer ─────────────────────────────────────────────
  useEffect(() => {
    if (!activeCall?.startedAt) { setElapsed(0); return }
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - activeCall.startedAt!) / 1000)), 1000)
    return () => clearInterval(id)
  }, [activeCall?.startedAt])

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled })
    setMuted((m) => !m)
  }

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled })
    setCamOff((c) => !c)
  }

  if (!activeCall) return null

  const isVideo = activeCall.type === 'video'
  const isConnected = activeCall.status === 'connected'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex flex-col bg-gray-950 text-white select-none"
    >
      {!isVideo && <audio ref={remoteAudioRef} autoPlay playsInline />}

      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Pre-connection overlay — only while waiting for the other party */}
      {!isConnected && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 ${isVideo ? 'bg-gray-950/80 backdrop-blur-sm' : ''}`}>
          {activeCall.otherUserAvatar ? (
            <img
              src={activeCall.otherUserAvatar}
              alt={activeCall.otherUserName}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-white/20"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
              {activeCall.otherUserName[0]?.toUpperCase()}
            </div>
          )}
          <p className="text-2xl font-semibold">{activeCall.otherUserName}</p>
          <p className="text-white/60 text-sm">{statusText}</p>
        </div>
      )}

      {/* Connected audio call */}
      {isConnected && !isVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          {activeCall.otherUserAvatar ? (
            <img src={activeCall.otherUserAvatar} alt={activeCall.otherUserName}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-white/20" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
              {activeCall.otherUserName[0]?.toUpperCase()}
            </div>
          )}
          <p className="text-2xl font-semibold">{activeCall.otherUserName}</p>
          <p className="text-white/70 text-lg font-mono">{fmt(elapsed)}</p>
        </div>
      )}

      {/* Local video corner */}
      {isVideo && (
        <div className="absolute top-4 right-4 w-28 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl z-10">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {camOff && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <FontAwesomeIcon icon={faVideoSlash} className="h-5 w-5 text-white/50" />
            </div>
          )}
        </div>
      )}

      {/* Duration badge (video + connected) */}
      {isVideo && isConnected && (
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm z-10">
          <span className="text-sm font-mono">{fmt(elapsed)}</span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-5 pb-12 pt-6 bg-gradient-to-t from-black/70 to-transparent">
        <button
          onClick={toggleMute}
          className={`h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${muted ? 'bg-red-500 shadow-lg shadow-red-500/40' : 'bg-white/20 hover:bg-white/30'}`}
          title={muted ? 'Unmute' : 'Mute'}
        >
          <FontAwesomeIcon icon={muted ? faMicrophoneSlash : faMicrophone} className="h-5 w-5" />
        </button>

        <button
          onClick={hangUp}
          className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-600/40"
          title="End call"
        >
          <FontAwesomeIcon icon={faPhoneSlash} className="h-6 w-6" />
        </button>

        {isVideo && (
          <button
            onClick={toggleCam}
            className={`h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${camOff ? 'bg-red-500 shadow-lg shadow-red-500/40' : 'bg-white/20 hover:bg-white/30'}`}
            title={camOff ? 'Turn camera on' : 'Turn camera off'}
          >
            <FontAwesomeIcon icon={camOff ? faVideoSlash : faVideo} className="h-5 w-5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}
