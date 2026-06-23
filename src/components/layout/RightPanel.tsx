'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/shared/SearchBar'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { formatNumber } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/database'

function FollowBtn({ username }: { username: string }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: 'POST' })
      if (res.ok) setFollowing((f) => !f)
      else toast.error('Failed')
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
  const { data } = useQuery({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const res = await fetch('/api/users/suggestions')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const users: (Profile & { reason?: string })[] = data?.suggestions?.slice(0, 5) ?? []

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
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <Link href={`/profile/${user.username}`}>
                  <UserAvatar user={user} size="sm" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <Link href={`/profile/${user.username}`} className="text-sm font-semibold hover:underline truncate">
                      {user.full_name || user.username}
                    </Link>
                    {user.is_verified && <span className="text-primary text-[10px]">✓</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.reason ?? `${formatNumber(user.followers_count)} followers`}
                  </p>
                </div>
                <FollowBtn username={user.username} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-1">
        <p className="text-xs text-muted-foreground">
          © 2025 Nexus · <Link href="/privacy" className="hover:underline">Privacy</Link> · <Link href="/terms" className="hover:underline">Terms</Link>
        </p>
      </div>
    </aside>
  )
}
