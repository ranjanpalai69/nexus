'use client'
import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage, faVideo, faSpinner, faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { faFaceSmile } from '@fortawesome/free-regular-svg-icons'
import { useAuthStore } from '@/store/authStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUIStore } from '@/store/uiStore'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import EmojiPickerComponent, { type EmojiClickData } from 'emoji-picker-react'
import { cn } from '@/lib/utils/cn'
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, MAX_FILE_SIZE } from '@/lib/utils/helpers'
import { MentionTextarea } from '@/components/shared/MentionTextarea'
import { MediaCarousel } from '@/components/shared/MediaCarousel'

interface UploadedMedia {
  url: string
  type: 'image' | 'video'
  previewUrl: string
  orderIndex: number
}

export function CreatePost({ onSuccess }: { onSuccess?: () => void }) {
  const user = useAuthStore((s) => s.user)
  const { setCreatePostOpen } = useUIStore()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<UploadedMedia[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (media.length + acceptedFiles.length > 10) { toast.error('Max 10 files'); return }
    setUploading(true)

    const uploadFile = async (file: File): Promise<UploadedMedia> => {
      const res = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size, folder: 'posts' }),
      })
      if (!res.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, publicUrl } = await res.json()
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      return {
        url: publicUrl,
        type: file.type.startsWith('video') ? 'video' : 'image',
        previewUrl: URL.createObjectURL(file),
        orderIndex: media.length,
      }
    }

    try {
      const uploads = await Promise.all(acceptedFiles.slice(0, 10 - media.length).map(uploadFile))
      setMedia((prev) => [...prev, ...uploads.map((u, i) => ({ ...u, orderIndex: prev.length + i }))])
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }, [media.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { ...ALLOWED_IMAGE_TYPES.reduce((a, t) => ({ ...a, [t]: [] }), {}), ...ALLOWED_VIDEO_TYPES.reduce((a, t) => ({ ...a, [t]: [] }), {}) },
    maxSize: MAX_FILE_SIZE,
    noClick: true,
  })

  const addEmoji = (data: EmojiClickData) => {
    const el = textareaRef.current
    if (!el) { setContent((c) => c + data.emoji); return }
    const start = el.selectionStart
    const end = el.selectionEnd
    setContent((c) => c.slice(0, start) + data.emoji + c.slice(end))
    setShowEmoji(false)
  }

  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim() || undefined,
          media: media.map(({ url, type, orderIndex }) => ({ url, type, orderIndex })),
        }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return }

      toast.success('Posted!')
      setContent('')
      setMedia([])
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setCreatePostOpen(false)
      onSuccess?.()
    } catch {
      toast.error('Failed to post')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="relative" {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10">
          <p className="font-semibold text-primary">Drop files here</p>
        </div>
      )}

      <div className="flex gap-3">
        <UserAvatar user={user} size="md" className="shrink-0 mt-1" />
        <div className="flex-1 space-y-3">
          <MentionTextarea
            value={content}
            onChange={setContent}
            placeholder="What's on your mind? Use @ to mention someone"
            rows={4}
            maxLength={2000}
            className="min-h-[100px] text-base"
            autoFocus
          />

          {/* Media Preview */}
          {media.length > 0 && (
            <MediaCarousel
              items={media.map((m) => ({ url: m.previewUrl, type: m.type }))}
              onRemove={(i) => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
              aspectRatio="video"
            />
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex gap-1 relative">
              <label className="cursor-pointer">
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))} />
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                  <FontAwesomeIcon icon={faImage} className="h-4 w-4" />
                </div>
              </label>
              <label className="cursor-pointer">
                <input type="file" accept="video/*" multiple className="hidden" onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))} />
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                  <FontAwesomeIcon icon={faVideo} className="h-4 w-4" />
                </div>
              </label>
              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className="h-9 w-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
              >
                <FontAwesomeIcon icon={faFaceSmile} className="h-4 w-4" />
              </button>
              {showEmoji && (
                <div className="absolute top-10 left-0 z-50">
                  <EmojiPickerComponent onEmojiClick={addEmoji} lazyLoadEmojis />
                </div>
              )}
              {uploading && <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin text-muted-foreground ml-2 mt-2.5" />}
            </div>
            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <span className={cn('text-xs', content.length > 1800 ? 'text-red-500' : 'text-muted-foreground')}>
                  {2000 - content.length}
                </span>
              )}
              <Button
                variant="gradient"
                size="sm"
                onClick={handleSubmit}
                loading={submitting}
                disabled={!content.trim() && media.length === 0}
                className="gap-2"
              >
                <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
