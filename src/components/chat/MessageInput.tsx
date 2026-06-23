'use client'
import { useState, useRef, useCallback } from 'react'
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
  const { addMessage } = useChatStore()
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText() }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    emitTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 2000)
  }

  const sendMessage = useCallback((payload: {
    content?: string; type?: string; mediaUrl?: string;
    fileName?: string; fileSize?: number; durationSeconds?: number; replyToId?: string
  }) => {
    if (!socket || !user) return
    const tempId = uuidv4()

    // Optimistic update
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
      reply_to_id: payload.replyToId ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: user,
    })

    socket.emit('message:send', {
      conversationId,
      tempId,
      content: payload.content,
      type: payload.type ?? 'text',
      mediaUrl: payload.mediaUrl,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      durationSeconds: payload.durationSeconds,
      replyToId: payload.replyToId ?? replyTo?.id,
    })
  }, [socket, user, addMessage, conversationId, replyTo])

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
    <div className="space-y-2">
      {replyTo && (
        <div className="flex items-center gap-2 rounded-xl border border-l-4 border-l-primary bg-muted px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">{replyTo.senderName}</p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content || '[media]'}</p>
          </div>
          <button onClick={onClearReply} className="text-muted-foreground hover:text-foreground">
            <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-muted/50 px-3 py-2 focus-within:border-primary transition-colors">
        <div className="flex items-center gap-1 pb-0.5">
          <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
            <FontAwesomeIcon icon={faImage} className="h-4 w-4" />
          </label>
          <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors ml-1">
            <input type="file" className="hidden" onChange={handleFileUpload} />
            <FontAwesomeIcon icon={faFile} className="h-4 w-4" />
          </label>
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-32"
          maxLength={2000}
        />

        <div className="flex items-center gap-1 pb-0.5">
          <div className="relative">
            <button onClick={() => setShowEmoji(!showEmoji)} className="text-muted-foreground hover:text-foreground transition-colors">
              <FontAwesomeIcon icon={faFaceSmile} className="h-4 w-4" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-8 right-0 z-50">
                <EmojiPickerComponent
                  onEmojiClick={(d: EmojiClickData) => { setContent((c) => c + d.emoji); setShowEmoji(false) }}
                  lazyLoadEmojis height={350}
                />
              </div>
            )}
          </div>

          {content.trim() ? (
            <Button size="icon-sm" variant="gradient" onClick={handleSendText} loading={uploadingMedia}>
              <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <button onClick={() => setShowVoice(true)} className="text-muted-foreground hover:text-primary transition-colors" disabled={uploadingMedia}>
              <FontAwesomeIcon icon={faMicrophone} className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
