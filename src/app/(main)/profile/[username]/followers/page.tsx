'use client'
import { use } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { useEffect, useState } from 'react'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faUsers } from '@fortawesome/free-solid-svg-icons'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/database'

export default function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const router = useRouter()
  const { ref, inView } = useInView()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['followers', username],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/users/${username}/followers?cursor=${pageParam || ''}`)
      return res.json()
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const users: Profile[] = data?.pages.flatMap((p) => p.users ?? []) ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-bold text-lg">Followers</h1>
          <p className="text-xs text-muted-foreground">@{username}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : users.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <FontAwesomeIcon icon={faUsers} className="h-12 w-12 opacity-20" />
            <p className="text-sm">No followers yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => u && <UserRow key={u.id} user={u} />)}
          </div>
        )}
      </div>

      <div ref={ref} className="flex justify-center py-2">
        {isFetchingNextPage && <LoadingSpinner size="sm" />}
      </div>
    </div>
  )
}

function UserRow({ user }: { user: Profile }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleFollow = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${user.username}/follow`, { method: 'POST' })
      if (!res.ok) { toast.error('Failed'); return }
      setFollowing((f) => !f)
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="flex items-center gap-3 p-4">
      <Link href={`/profile/${user.username}`}>
        <UserAvatar user={user} size="md" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.username}`} className="hover:underline">
          <p className="text-sm font-semibold truncate flex items-center gap-1">
            {user.full_name || user.username}
            {user.is_verified && <span className="text-primary text-xs">✓</span>}
          </p>
        </Link>
        <p className="text-xs text-muted-foreground">@{user.username}</p>
        {user.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{user.bio}</p>}
      </div>
      <Button size="sm" variant={following ? 'outline' : 'gradient'} className="h-7 text-xs shrink-0" onClick={handleFollow} loading={loading}>
        {following ? 'Following' : 'Follow'}
      </Button>
    </div>
  )
}
