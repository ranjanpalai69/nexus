'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { PostCard } from '@/components/feed/PostCard'
import { PageLoader, LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFire } from '@fortawesome/free-solid-svg-icons'
import type { PostWithDetails } from '@/types/database'

interface FeedListProps {
  type?: 'feed' | 'explore'
  userId?: string
}

export function FeedList({ type = 'feed', userId }: FeedListProps) {
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ['posts', type, userId],
    queryFn: async ({ pageParam }) => {
      const url = userId
        ? `/api/users/${userId}/posts?cursor=${pageParam || ''}`
        : `/api/posts?type=${type}&cursor=${pageParam || ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch posts')
      return res.json()
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return <PageLoader />

  if (isError) return (
    <div className="py-16 text-center text-muted-foreground">
      <p>Failed to load posts. Please try again.</p>
    </div>
  )

  const posts: PostWithDetails[] = data?.pages.flatMap((p) => p.posts) ?? []

  if (posts.length === 0) return (
    <div className="py-16 text-center space-y-3">
      <FontAwesomeIcon icon={faFire} className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-muted-foreground">
        {type === 'feed' ? 'Follow some people to see their posts here.' : 'No posts yet. Be the first!'}
      </p>
    </div>
  )

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isFetchingNextPage && <LoadingSpinner size="sm" />}
      </div>
    </div>
  )
}
