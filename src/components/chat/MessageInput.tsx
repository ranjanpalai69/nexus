'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faImage, faMicrophone, faFile, faXmark } from '@fortawesome/free-solid-svg-icons'
import { faFaceSmile } from '@fortawesome/free-regular-svg-icons'
import { Button } from '@/components/ui/button'
import { VoiceRecorder } from './VoiceRecorder'
import { getSocket } from '@/lib/socket/client'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import EmojiPickerComponent, { type EmojiClickData } from 'emoji-picker-react'
import toast from 'react-hot-toast'
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '@/lib/utils/helpers'
import { v4 as uuidv4 } from 'uuid'

interface MessageInputProps {
  conversationId: string
  replyTo?: { id: string; content: string | null; senderName: string } | null
  onClearReply?: () => void
}

export function MessageInput({ conversationId, replyTo, onClearReply }: MessageInputProps) {
  const user = useAuthStore((s) => s.user)
  const addMessage = useChatStore((s) => s.addMessage)
  const [content, setContent] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const socket = user ? getSocket(user.id) : null

  const emitTyping = useCallback((isTyping: boolean) => {
    socket?.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId })
  }, [socket, conversationId])

  // Auto-grow the textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [])

  useEffect(() => {
    autoResize()
  }, [content, autoResize])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText() }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    emitTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 2000)
  }

  const sendMessage = useCallback(async (payload: {
    content?: string; type?: string; mediaUrl?: string;
    fileName?: string; fileSize?: number; durationSeconds?: number; replyToId?: string
  }) => {
    if (!user) return
    const tempId = uuidv4()

    addMessage(conversationId, {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: payload.content ?? null,
      type: (payload.type as never) ?? 'text',
      media_url: payload.mediaUrl ?? null,
      file_name: payload.fileName ?? null,
      file_size: payload.fileSize ?? null,
      duration_seconds: payload.durationSeconds ?? null,
      is_deleted: false,
      reply_to_id: payload.replyToId ?? replyTo?.id ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: user,
    })

    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: payload.content,
          type: payload.type ?? 'text',
          mediaUrl: payload.mediaUrl,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          durationSeconds: payload.durationSeconds,
          replyToId: payload.replyToId ?? replyTo?.id,
          tempId,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('[MessageInput] send failed:', body)
        toast.error('Message failed to send')
      }
    } catch (err) {
      console.error('[MessageInput] send error:', err)
      toast.error('Message failed to send')
    }
  }, [user, addMessage, conversationId, replyTo])

  const handleSendText = () => {
    if (!content.trim()) return
    sendMessage({ content: content.trim(), type: 'text' })
    setContent('')
    emitTyping(false)
    onClearReply?.()
  }

  const handleVoiceSend = (audioUrl: string, durationSeconds: number) => {
    sendMessage({ type: 'audio', mediaUrl: audioUrl, durationSeconds })
    setShowVoice(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadingMedia(true)
    try {
      const isMedia = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(file.type)
      const folder = isMedia ? 'chat' : 'chat'
      const res = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size, folder }),
      })
      const { uploadUrl, publicUrl } = await res.json()
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

      const type = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file'
      sendMessage({ type, mediaUrl: publicUrl, fileName: file.name, fileSize: file.size })
    } catch {
      toast.error('File upload failed')
    } finally {
      setUploadingMedia(false)
    }
  }

  if (showVoice) return <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowVoice(false)} />

  return (
    <div className="flex items-end gap-2">
      {/* Media upload icons — left side */}
      <div className="flex items-center gap-1 pb-2.5 shrink-0">
        <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-1" title="Image / Video">
          <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
          <FontAwesomeIcon icon={faImage} className="h-[18px] w-[18px]" />
        </label>
        <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-1" title="File">
          <input type="file" className="hidden" onChange={handleFileUpload} />
          <FontAwesomeIcon icon={faFile} className="h-[18px] w-[18px]" />
        </label>
      </div>

      {/* Text area + emoji + send */}
      <div className="flex-1 flex items-end gap-2 rounded-2xl border border-border bg-muted/50 px-3 py-2 focus-within:border-primary transition-colors min-w-0">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground leading-relaxed self-end"
          maxLength={2000}
          style={{ minHeight: '22px', maxHeight: '128px' }}
        />

        {/* Emoji */}
        <div className="relative shrink-0 pb-0.5">
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <FontAwesomeIcon icon={faFaceSmile} className="h-[18px] w-[18px]" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-9 right-0 z-50">
              <EmojiPickerComponent
                onEmojiClick={(d: EmojiClickData) => {
                  setContent((c) => c + d.emoji)
                  setShowEmoji(false)
                  textareaRef.current?.focus()
                }}
                lazyLoadEmojis
                height={350}
              />
            </div>
          )}
        </div>
      </div>

      {/* Send / Mic — right side */}
      <div className="pb-1.5 shrink-0">
        {content.trim() ? (
          <Button size="icon-sm" variant="gradient" onClick={handleSendText} loading={uploadingMedia}>
            <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => setShowVoice(true)}
            disabled={uploadingMedia}
            className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faMicrophone} className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </div>
  )
}
