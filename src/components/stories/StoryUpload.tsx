'use client'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faCloudArrowUp, faPaperPlane, faSpinner } from '@fortawesome/free-solid-svg-icons'
import toast from 'react-hot-toast'

interface StoryUploadProps {
  onClose: () => void
  onSuccess: () => void
}

export function StoryUpload({ onClose, onSuccess }: StoryUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image') && !f.type.startsWith('video')) {
      toast.error('Only images and videos allowed')
      return
    }
    if (f.size > 50 * 1024 * 1024) { toast.error('File too large (max 50MB)'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    try {
      const presignRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size, folder: 'stories' }),
      })
      if (!presignRes.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, publicUrl } = await presignRes.json()
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: publicUrl,
          mediaType: file.type.startsWith('video') ? 'video' : 'image',
          caption: caption.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to post story')
      toast.success('Story posted! It will disappear in 24 hours.')
      onSuccess()
    } catch {
      toast.error('Failed to upload story')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-card rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm">Add to Story</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!preview ? (
            <div
              className="border-2 border-dashed border-border rounded-xl aspect-[9/16] max-h-64 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary transition-colors"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <FontAwesomeIcon icon={faCloudArrowUp} className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-sm font-medium">Drag or tap to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Image or video · max 50MB</p>
              </div>
              <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden aspect-[9/16] max-h-64 bg-muted">
              {file?.type.startsWith('video') ? (
                <video src={preview} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => { setPreview(null); setFile(null) }}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
              </button>
            </div>
          )}

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption... (optional)"
            maxLength={300}
            className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />

          <button
            disabled={!file || uploading}
            onClick={handleSubmit}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
                Share Story
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
