'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faLocationDot, faUsers, faStar } from '@fortawesome/free-solid-svg-icons'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { PostCard } from '@/components/feed/PostCard'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Profile, PostWithDetails } from '@/types/database'

interface SuggestionUser extends Profile {
  reason: string
}

function FollowButton({ username, initialFollowing }: { username: string; initialFollowing?: boolean }) {
  const [following, setFollowing] = useState(initialFollowing ?? false)
  const [loading, setLoading] = useState(false)

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: 'POST' })
      if (!res.ok) { toast.error('Failed'); return }
      setFollowing((f) => !f)
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }

  return (
    <Button
      size="sm"
      variant={following ? 'outline' : 'gradient'}
      className="shrink-0 h-7 text-xs"
      onClick={handleFollow}
      loading={loading}
    >
      {following ? 'Following' : 'Follow'}
    </Button>
  )
}

function SuggestionSection({ title, icon, users }: {
  title: string
  icon: React.ReactNode
  users: SuggestionUser[]
}) {
  if (!users.length) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-1">
        {users.map((user, i) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link href={`/profile/${user.username}`}>
              <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-accent transition-colors">
                <UserAvatar user={user} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold truncate">{user.full_name || user.username}</p>
                    {user.is_verified && <span className="text-primary text-xs shrink-0">✓</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  <p className="text-xs text-primary/70 truncate mt-0.5">{user.reason}</p>
                </div>
                <FollowButton username={user.username} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const currentUser = useAuthStore((s) => s.user)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const debouncedQuery = useDebounce(query, 400)

  const { data: searchData } = useQuery({
    queryKey: ['search', 'all', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return { users: [], posts: [] }
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&type=all`)
      return res.json()
    },
    enabled: debouncedQuery.length > 0,
  })

  const { data: suggestionsData } = useQuery({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const res = await fetch('/api/users/suggestions')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    enabled: !debouncedQuery,
  })

  const suggestions: SuggestionUser[] = suggestionsData?.suggestions ?? []

  const nearbyUsers = suggestions.filter((u) =>
    u.reason?.toLowerCase().includes('near you') || u.reason?.toLowerCase().includes('nearby')
  )
  const mutualUsers = suggestions.filter((u) =>
    u.reason?.toLowerCase().includes('mutual') || u.reason?.toLowerCase().includes('followed by')
  )
  const popularUsers = suggestions.filter((u) =>
    u.reason?.toLowerCase().includes('popular')
  )

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 pt-1">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, posts..."
          leftIcon={<FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />}
          className="h-12 text-base"
          autoFocus
        />
      </div>

      <AnimatePresence mode="wait">
        {debouncedQuery ? (
          <motion.div
            key="search-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Tabs defaultValue="users">
              <TabsList className="w-full">
                <TabsTrigger value="users" className="flex-1">
                  People {searchData?.users?.length > 0 && `(${searchData.users.length})`}
                </TabsTrigger>
                <TabsTrigger value="posts" className="flex-1">
                  Posts {searchData?.posts?.length > 0 && `(${searchData.posts.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="mt-3 space-y-1">
                {(searchData?.users ?? []).map((u: Profile & { is_following?: boolean }) => (
                  <Link key={u.id} href={`/profile/${u.username}`}>
                    <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-accent transition-colors">
                      <UserAvatar user={u} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold truncate">{u.full_name || u.username}</p>
                          {u.is_verified && <span className="text-primary text-xs">✓</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">@{u.username} · {u.followers_count} followers</p>
                        {u.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{u.bio}</p>}
                      </div>
                      {u.id !== currentUser?.id && <FollowButton username={u.username} initialFollowing={u.is_following} />}
                    </div>
                  </Link>
                ))}
                {searchData?.users?.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No users found for &quot;{debouncedQuery}&quot;</p>
                )}
              </TabsContent>

              <TabsContent value="posts" className="mt-3 space-y-3">
                {(searchData?.posts ?? []).map((post: PostWithDetails) => (
                  <PostCard key={post.id} post={post} />
                ))}
                {searchData?.posts?.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No posts found for &quot;{debouncedQuery}&quot;</p>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {suggestions.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="h-12 w-12 opacity-20 mb-3" />
                <p className="font-medium">Discover People</p>
                <p className="text-sm mt-1">Search or explore suggested people</p>
              </div>
            )}

            <SuggestionSection
              title="Near You"
              icon={<FontAwesomeIcon icon={faLocationDot} className="h-3.5 w-3.5 text-emerald-500" />}
              users={nearbyUsers}
            />
            <SuggestionSection
              title="People You Might Know"
              icon={<FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5 text-indigo-500" />}
              users={mutualUsers}
            />
            <SuggestionSection
              title="Popular on Nexus"
              icon={<FontAwesomeIcon icon={faStar} className="h-3.5 w-3.5 text-amber-500" />}
              users={popularUsers}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  )
}
