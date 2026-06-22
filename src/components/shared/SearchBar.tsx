'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/useDebounce'
import type { Profile } from '@/types/database'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['search', 'users', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { users: [] }
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&type=users`)
      return res.json()
    },
    enabled: debouncedQuery.length > 0,
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const users: Profile[] = data?.users ?? []

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <Input
        placeholder="Search Nexus..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        leftIcon={<FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />}
        rightIcon={query ? (
          <button onClick={() => { setQuery(''); setOpen(false) }}>
            <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
          </button>
        ) : undefined}
        className="h-9 rounded-full bg-muted border-0"
      />
      {open && users.length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-2xl border border-border bg-card shadow-2xl p-2 z-50">
          {users.map((user) => (
            <button
              key={user.id}
              className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-accent transition-colors text-left"
              onClick={() => { router.push(`/profile/${user.username}`); setOpen(false); setQuery('') }}
            >
              <UserAvatar user={user} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user.full_name || user.username}</p>
                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
              </div>
            </button>
          ))}
          <button
            className="w-full mt-1 text-center text-xs text-primary py-2 hover:underline"
            onClick={() => { router.push(`/search?q=${encodeURIComponent(query)}`); setOpen(false) }}
          >
            See all results for &quot;{query}&quot;
          </button>
        </div>
      )}
    </div>
  )
}
