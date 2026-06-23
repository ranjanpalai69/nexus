'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserAvatar } from './UserAvatar'
import { Button } from '@/components/ui/button'
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
      if (res.ok) { setFollowing(true); onFollowed() }
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

export function MobileWhoToFollow() {
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

  const users: (Profile & { reason?: string })[] = (data?.suggestions ?? [])
    .filter((u: Profile) => !hiddenIds.has(u.id))
    .slice(0, 6)

  if (!users.length) return null

  return (
    <div className="xl:hidden rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Who to Follow</h3>
        <Link href="/search" className="text-xs text-primary hover:underline">See all</Link>
      </div>

      {/* Horizontal scroll on mobile, vertical on tablet */}
      <div className="flex gap-3 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex-shrink-0 w-36 sm:w-auto sm:flex sm:items-center sm:gap-3 flex-col sm:flex-row items-center text-center sm:text-left rounded-xl border border-border sm:border-0 p-3 sm:p-0 bg-background sm:bg-transparent"
          >
            <Link href={`/profile/${u.username}`} className="sm:shrink-0">
              <UserAvatar user={u} size="md" />
            </Link>
            <div className="flex-1 min-w-0 mt-1 sm:mt-0">
              <Link href={`/profile/${u.username}`}>
                <p className="text-xs font-semibold truncate hover:underline">{u.full_name || u.username}</p>
              </Link>
              <p className="text-[10px] text-muted-foreground truncate">
                {u.reason ?? `${formatNumber(u.followers_count)} followers`}
              </p>
            </div>
            <FollowBtn
              username={u.username}
              onFollowed={() => setTimeout(() => { setHiddenIds((p) => new Set([...p, u.id])); queryClient.invalidateQueries({ queryKey: ['suggestions'] }) }, 600)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
