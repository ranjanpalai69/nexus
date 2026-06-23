'use client'
import { useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { PostCard } from '@/components/feed/PostCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart } from '@fortawesome/free-solid-svg-icons'
import type { PostWithDetails } from '@/types/database'

interface LikedPostsProps {
  username: string
}

export function LikedPosts({ username }: LikedPostsProps) {
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['user-liked', username],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/users/${username}/liked?cursor=${pageParam || ''}`)
      return res.json()
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts: PostWithDetails[] = data?.pages.flatMap((p) => p.posts) ?? []

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>

  if (posts.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
      <FontAwesomeIcon icon={faHeart} className="h-12 w-12 opacity-20" />
      <p className="text-sm">No liked posts yet</p>
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
