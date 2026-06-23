'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faSearch, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useChatStore } from '@/store/chatStore'
import type { Profile } from '@/types/database'

interface NewMessageModalProps {
  onClose: () => void
}

export function NewMessageModal({ onClose }: NewMessageModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()
  const addConversation = useChatStore((s) => s.addConversation)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Load mutual followers when search is empty
  useEffect(() => {
    if (query.trim()) return
    fetch('/api/users/mutual')
      .then((r) => r.json())
      .then((d) => setResults(d.users ?? []))
      .catch(() => {})
  }, [query])

  // Search users when query is non-empty
  useEffect(() => {
    if (!query.trim()) return
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&type=users&limit=10`)
        const data = await res.json()
        setResults(data.users ?? [])
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const startConversation = async (user: Profile) => {
    setStarting(user.id)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: user.id }),
      })
      if (!res.ok) { toast.error('Could not start conversation'); return }
      const data = await res.json()
      if (data.conversation?.id) {
        // Add to store immediately so it appears in the list without waiting for refetch
        addConversation(data.conversation)
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
        router.push(`/messages/${data.conversation.id}`)
        onClose()
      }
    } catch { toast.error('Failed to start conversation') }
    finally { setStarting(null) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold text-sm">New Message</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <FontAwesomeIcon icon={faSearch} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searching && <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 text-muted-foreground animate-spin" />}
        </div>

        <div className="max-h-72 overflow-y-auto">
          {results.length === 0 && !searching && query.trim() && (
            <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
          )}
          {results.length === 0 && !query.trim() && !searching && (
            <p className="text-center text-xs text-muted-foreground py-8 opacity-60">No mutual connections yet. Search to find anyone.</p>
          )}
          {results.length > 0 && !query.trim() && (
            <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Friends</p>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              disabled={!!starting}
              onClick={() => startConversation(u)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
            >
              <UserAvatar user={u} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.full_name || u.username}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
              {starting === u.id && (
                <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
