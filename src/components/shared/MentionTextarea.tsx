'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { UserAvatar } from './UserAvatar'
import { cn } from '@/lib/utils/cn'
import type { Profile } from '@/types/database'

interface MentionTextareaProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  autoFocus?: boolean
}

export function MentionTextarea({
  value, onChange, placeholder, rows = 3, maxLength = 2000,
  className, onKeyDown, autoFocus,
}: MentionTextareaProps) {
  const [suggestions, setSuggestions] = useState<Profile[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState<number>(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const detectMention = useCallback((text: string, cursor: number) => {
    const before = text.slice(0, cursor)
    const match = before.match(/@(\w*)$/)
    if (match) {
      setMentionStart(cursor - match[0].length)
      setMentionQuery(match[1])
    } else {
      setMentionQuery(null)
      setSuggestions([])
    }
  }, [])

  useEffect(() => {
    if (mentionQuery === null) return
    if (mentionQuery.length === 0) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(mentionQuery)}&type=users&limit=6`)
      const d = await res.json()
      setSuggestions(d.users ?? [])
    }, 250)
    return () => clearTimeout(t)
  }, [mentionQuery])

  const insertMention = (u: Profile) => {
    const before = value.slice(0, mentionStart)
    const after = value.slice(textareaRef.current?.selectionStart ?? value.length)
    const newVal = `${before}@${u.username} ${after}`
    onChange(newVal)
    setMentionQuery(null)
    setSuggestions([])
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + u.username.length + 2
        textareaRef.current.setSelectionRange(pos, pos)
        textareaRef.current.focus()
      }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(suggestions[activeIndex]); return }
      if (e.key === 'Escape') { setMentionQuery(null); setSuggestions([]); return }
    }
    onKeyDown?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    detectMention(e.target.value, e.target.selectionStart)
    setActiveIndex(0)
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        autoFocus={autoFocus}
        className={cn('w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground', className)}
      />
      {suggestions.length > 0 && mentionQuery !== null && (
        <div
          ref={dropdownRef}
          className="absolute z-50 bottom-full mb-1 left-0 bg-popover border border-border rounded-xl shadow-xl overflow-hidden w-56"
        >
          {suggestions.map((u, i) => (
            <button
              key={u.id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(u) }}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors text-sm',
                i === activeIndex ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <UserAvatar user={u} size="xs" />
              <div className="min-w-0">
                <p className="font-medium truncate">{u.full_name || u.username}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Parse @mentions in text and extract mentioned usernames
export function extractMentions(text: string): string[] {
  const matches = text.matchAll(/@(\w+)/g)
  return [...new Set([...matches].map((m) => m[1]))]
}

// Render text with clickable @mentions and URLs
export function RenderWithMentions({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(@\w+|https?:\/\/\S+)/g)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <a key={i} href={`/profile/${part.slice(1)}`} className="text-primary font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
              {part}
            </a>
          )
        }
        if (/^https?:\/\//.test(part)) {
          const display = part.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 50)
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all" onClick={(e) => e.stopPropagation()}>
              {display}{part.replace(/^https?:\/\//, '').replace(/\/$/, '').length > 50 ? '…' : ''}
            </a>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
