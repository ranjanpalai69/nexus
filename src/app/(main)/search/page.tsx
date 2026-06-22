'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { PostCard } from '@/components/feed/PostCard'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/useDebounce'
import Link from 'next/link'
import type { Profile, PostWithDetails } from '@/types/database'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const debouncedQuery = useDebounce(query, 400)

  const { data, isLoading } = useQuery({
    queryKey: ['search', 'all', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return { users: [], posts: [] }
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&type=all`)
      return res.json()
    },
    enabled: debouncedQuery.length > 0,
  })

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users, posts..."
        leftIcon={<FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />}
        className="h-12 text-base"
        autoFocus
      />

      {debouncedQuery && (
        <Tabs defaultValue="users">
          <TabsList className="w-full">
            <TabsTrigger value="users" className="flex-1">People</TabsTrigger>
            <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-3 space-y-2">
            {(data?.users ?? []).map((user: Profile) => (
              <Link key={user.id} href={`/profile/${user.username}`}>
                <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-accent transition-colors">
                  <UserAvatar user={user} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user.full_name || user.username}</p>
                    <p className="text-xs text-muted-foreground">@{user.username} · {user.followers_count} followers</p>
                    {user.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{user.bio}</p>}
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0">Follow</Button>
                </div>
              </Link>
            ))}
            {data?.users?.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No users found for &quot;{debouncedQuery}&quot;</p>
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-3 space-y-3">
            {(data?.posts ?? []).map((post: PostWithDetails) => (
              <PostCard key={post.id} post={post} />
            ))}
            {data?.posts?.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No posts found for &quot;{debouncedQuery}&quot;</p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!debouncedQuery && (
        <div className="py-16 text-center text-muted-foreground">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="h-12 w-12 opacity-20 mb-3" />
          <p>Search for people, posts, and more</p>
        </div>
      )}
    </div>
  )
}
