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

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

function fmt(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
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

  // Cleanup helper — does NOT emit call:end (call it only on remote-ended calls)
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
      // Call never connected — cancel the invite (goes to callee personal room)
      socket.emit('call:cancel', { conversationId: call.conversationId, calleeId: call.otherUserId })
    } else {
      const duration = Math.floor((Date.now() - call.startedAt) / 1000)
      socket.emit('call:end', { conversationId: call.conversationId, duration, type: call.type })
    }
    cleanupRefs()
    setActiveCall(null)
  }, [userId, setActiveCall, cleanupRefs])

  // ── Main WebRTC effect ────────────────────────────────────────────
  useEffect(() => {
    if (!activeCall || !userId) return

    const { conversationId, direction, type } = activeCall
    const socket = getSocket(userId)
    let pc: RTCPeerConnection | null = null
    let localStream: MediaStream | null = null
    let dead = false

    const init = async () => {
      // 1. Get user media
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
      } catch {
        setStatusText('Microphone/camera access denied')
        return
      }
      if (dead) { localStream.getTracks().forEach((t) => t.stop()); return }

      localStreamRef.current = localStream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream
      }

      // 2. Create peer connection
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc

      localStream.getTracks().forEach((t) => pc!.addTrack(t, localStream!))

      pc.ontrack = (e) => {
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
        if (pc?.connectionState === 'disconnected' || pc?.connectionState === 'failed') {
          hangUp()
        }
      }

      if (direction === 'outbound') {
        setStatusText('Ringing...')
      } else {
        setStatusText('Connecting...')
      }
    }

    init()

    // ── Socket event handlers ──
    const onAccept = async () => {
      if (direction !== 'outbound' || !pcRef.current) return
      setStatusText('Connecting...')
      try {
        const offer = await pcRef.current.createOffer()
        await pcRef.current.setLocalDescription(offer)
        socket.emit('call:offer', { conversationId, sdp: offer })
      } catch (err) {
        console.error('[call] createOffer failed', err)
      }
    }

    const onOffer = async ({ sdp }: { conversationId: string; sdp: RTCSessionDescriptionInit }) => {
      if (direction !== 'inbound' || !pcRef.current) return
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
        const answer = await pcRef.current.createAnswer()
        await pcRef.current.setLocalDescription(answer)
        socket.emit('call:answer', { conversationId, sdp: answer })
      } catch (err) {
        console.error('[call] handleOffer failed', err)
      }
    }

    const onAnswer = async ({ sdp }: { conversationId: string; sdp: RTCSessionDescriptionInit }) => {
      if (!pcRef.current) return
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
      } catch (err) {
        console.error('[call] handleAnswer failed', err)
      }
    }

    const onIce = async ({ candidate }: { conversationId: string; candidate: RTCIceCandidateInit }) => {
      if (!pcRef.current) return
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
    }

    const onRemoteEnd = () => {
      cleanupRefs()
      setActiveCall(null)
    }

    const onReject = () => {
      setStatusText('Call declined')
      setTimeout(() => { cleanupRefs(); setActiveCall(null) }, 1500)
    }

    const onBusy = () => {
      setStatusText('User is busy')
      setTimeout(() => { cleanupRefs(); setActiveCall(null) }, 1500)
    }

    socket.on('call:accept', onAccept)
    socket.on('call:offer', onOffer)
    socket.on('call:answer', onAnswer)
    socket.on('call:ice-candidate', onIce)
    socket.on('call:end', onRemoteEnd)
    socket.on('call:reject', onReject)
    socket.on('call:busy', onBusy)

    return () => {
      dead = true
      socket.off('call:accept', onAccept)
      socket.off('call:offer', onOffer)
      socket.off('call:answer', onAnswer)
      socket.off('call:ice-candidate', onIce)
      socket.off('call:end', onRemoteEnd)
      socket.off('call:reject', onReject)
      socket.off('call:busy', onBusy)
      localStream?.getTracks().forEach((t) => t.stop())
      pc?.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.conversationId, activeCall?.direction, activeCall?.type, userId])

  // ── Duration timer ─────────────────────────────────────────────────
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
      {/* Hidden audio element for audio calls */}
      {!isVideo && <audio ref={remoteAudioRef} autoPlay playsInline />}

      {/* Remote video background */}
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Overlay for non-video or pre-connection */}
      {(!isVideo || !isConnected) && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 ${isVideo ? 'bg-gray-950/80 backdrop-blur-sm' : ''}`}>
          {/* Avatar */}
          <div className="relative">
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
          </div>
          <p className="text-2xl font-semibold">{activeCall.otherUserName}</p>
          <p className="text-white/60 text-sm">{statusText || fmt(elapsed)}</p>
        </div>
      )}

      {/* Local video (video call, top-right corner) */}
      {isVideo && (
        <div className="absolute top-safe top-4 right-4 w-28 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl z-10">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {camOff && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <FontAwesomeIcon icon={faVideoSlash} className="h-5 w-5 text-white/50" />
            </div>
          )}
        </div>
      )}

      {/* Duration (video + connected) */}
      {isVideo && isConnected && (
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm z-10">
          <span className="text-sm font-mono">{fmt(elapsed)}</span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-5 pb-12 pt-6 bg-gradient-to-t from-black/60 to-transparent">
        <button
          onClick={toggleMute}
          className={`h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${muted ? 'bg-red-500 shadow-red-500/40 shadow-lg' : 'bg-white/20 hover:bg-white/30'}`}
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
            className={`h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${camOff ? 'bg-red-500 shadow-red-500/40 shadow-lg' : 'bg-white/20 hover:bg-white/30'}`}
            title={camOff ? 'Turn camera on' : 'Turn camera off'}
          >
            <FontAwesomeIcon icon={camOff ? faVideoSlash : faVideo} className="h-5 w-5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}
