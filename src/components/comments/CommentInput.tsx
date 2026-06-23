'use client'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { faFaceSmile } from '@fortawesome/free-regular-svg-icons'
import EmojiPickerComponent, { type EmojiClickData } from 'emoji-picker-react'
import { MentionTextarea } from '@/components/shared/MentionTextarea'
import toast from 'react-hot-toast'

interface CommentInputProps {
  postId: string
  parentId?: string
  onSuccess?: () => void
  onCancel?: () => void
  placeholder?: string
}

export function CommentInput({ postId, parentId, onSuccess, onCancel, placeholder }: CommentInputProps) {
  const user = useAuthStore((s) => s.user)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim() || !user) return
    setLoading(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), parentId }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return }
      setContent('')
      onSuccess?.()
    } catch { toast.error('Failed to post comment') }
    finally { setLoading(false) }
  }

  if (!user) return null

  return (
    <div className="flex gap-2">
      <UserAvatar user={user} size="sm" className="mt-1 shrink-0" />
      <div className="flex-1 relative">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 focus-within:border-primary transition-colors">
          <MentionTextarea
            value={content}
            onChange={setContent}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder={placeholder || (parentId ? 'Write a reply... (@mention someone)' : 'Write a comment... (@mention someone)')}
            rows={1}
            maxLength={1000}
            className="flex-1 text-sm"
          />
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <div className="relative">
              <button onClick={() => setShowEmoji(!showEmoji)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <FontAwesomeIcon icon={faFaceSmile} className="h-4 w-4" />
              </button>
              {showEmoji && (
                <div className="absolute bottom-10 right-0 z-50">
                  <EmojiPickerComponent
                    onEmojiClick={(d: EmojiClickData) => { setContent((c) => c + d.emoji); setShowEmoji(false) }}
                    lazyLoadEmojis
                    height={350}
                  />
                </div>
              )}
            </div>
            <Button size="icon-sm" variant="gradient" onClick={handleSubmit} loading={loading} disabled={!content.trim()}>
              <FontAwesomeIcon icon={faPaperPlane} className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="mt-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        )}
      </div>
    </div>
  )
}
