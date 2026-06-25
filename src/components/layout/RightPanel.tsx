import { VerifiedBadge } from '@/components/shared/VerifiedBadge'
import Link from 'next/link'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/shared/SearchBar'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { formatNumber } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/database'

function FollowBtn({ username, onFollowed }: { username: string; onFollowed: () => void }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: 'POST' })
      if (res.ok) {
        if (!following) {
          setFollowing(true)
          onFollowed()
        } else {
          setFollowing(false)
        }
      } else toast.error('Failed')
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }
  return (
    <Button size="sm" variant={following ? 'outline' : 'gradient'} className="shrink-0 h-7 text-xs px-3" onClick={toggle} loading={loading}>
      {following ? 'Following' : 'Follow'}
    </Button>
  )
}

export function RightPanel() {
  const queryClient = useQueryClient()
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  const { data } = useQuery({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const res = await fetch('/api/users/suggestions')
      return res.json()
    },
    staleTime: 60 * 1000,
  })

  const allUsers: (Profile & { reason?: string })[] = data?.suggestions ?? []
  const users = allUsers.filter((u) => !hiddenIds.has(u.id)).slice(0, 5)

  const handleFollowed = (id: string) => {
    // Hide from panel immediately after following
    setTimeout(() => {
      setHiddenIds((prev) => new Set([...prev, id]))
      queryClient.invalidateQueries({ queryKey: ['suggestions'] })
    }, 600)
  }

  return (
    <aside className="sticky top-6 flex flex-col gap-4 w-72">
      <div className="flex items-center gap-2">
        <SearchBar />
        <ThemeToggle />
      </div>

      {/* Suggested Users */}
      {users.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Who to follow</h3>
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Link href={`/profile/${u.username}`}>
                  <UserAvatar user={u} size="sm" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <Link href={`/profile/${u.username}`} className="text-sm font-semibold hover:underline truncate">
                      {u.full_name || u.username}
                    </Link>
                    {u.is_verified && <VerifiedBadge className="h-3 w-3" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {u.reason ?? `${formatNumber(u.followers_count)} followers`}
                  </p>
                </div>
                <FollowBtn username={u.username} onFollowed={() => handleFollowed(u.id)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-1 space-y-1">
        <p className="text-xs text-muted-foreground">
          © 2025 Nexus · <Link href="/privacy" className="hover:underline">Privacy</Link> · <Link href="/terms" className="hover:underline">Terms</Link>
        </p>
        <p className="text-xs text-muted-foreground">
          Made &amp; managed by{' '}
          <a
            href="https://ranjanpalai69.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-foreground font-medium"
          >
            Ranjan Palai
          </a>
        </p>
      </div>
    </aside>
  )
}
