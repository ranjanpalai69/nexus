'use client'
import { useState, useRef, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMicrophone, faStop, faTrash, faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { secondsToTime, ALLOWED_AUDIO_TYPES } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import toast from 'react-hot-toast'

interface VoiceRecorderProps {
  onSend: (audioUrl: string, durationSeconds: number) => void
  onCancel: () => void
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start(100)
      setRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } catch {
      toast.error('Microphone access denied')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }, [])

  const handleSend = async () => {
    if (!audioBlob) return
    setUploading(true)
    try {
      const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
      const res = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size, folder: 'audio' }),
      })
      const { uploadUrl, publicUrl } = await res.json()
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      onSend(publicUrl, duration)
    } catch {
      toast.error('Failed to send voice message')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted px-4 py-3">
      {!audioUrl ? (
        <>
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center transition-all',
              recording ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-primary text-primary-foreground'
            )}
          >
            <FontAwesomeIcon icon={recording ? faStop : faMicrophone} className="h-4 w-4" />
          </button>
          <div className="flex-1">
            {recording ? (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-mono text-red-500">{secondsToTime(duration)}</span>
                <span className="text-xs text-muted-foreground">Recording... release to stop</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Hold to record voice message</p>
            )}
          </div>
        </>
      ) : (
        <>
          <audio src={audioUrl} controls className="flex-1 h-8" />
          <span className="text-xs text-muted-foreground">{secondsToTime(duration)}</span>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => { setAudioBlob(null); setAudioUrl(null); setDuration(0) }}>
            <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="gradient" onClick={handleSend} loading={uploading}>
            <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={onCancel}>
        ×
      </Button>
    </div>
  )
}
