'use client'
import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage, faPlay, faHeart, faComment } from '@fortawesome/free-solid-svg-icons'
import { formatNumber } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import type { PostWithDetails } from '@/types/database'

interface MediaGridProps {
  username: string
}

export function MediaGrid({ username }: MediaGridProps) {
  const [selected, setSelected] = useState<PostWithDetails | null>(null)
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['user-media', username],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/users/${username}/media?cursor=${pageParam || ''}`)
      return res.json()
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts: PostWithDetails[] = data?.pages.flatMap((p) => p.posts) ?? []

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>

  if (posts.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
      <FontAwesomeIcon icon={faImage} className="h-12 w-12 opacity-20" />
      <p className="text-sm">No media posts yet</p>
    </div>
  )

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 mt-1">
        {posts.map((post) => {
          const firstMedia = post.media?.[0]
          const isVideo = firstMedia?.type === 'video'
          return (
            <button
              key={post.id}
              onClick={() => setSelected(post)}
              className="relative aspect-square group overflow-hidden bg-muted"
            >
              {firstMedia?.url && (
                isVideo ? (
                  <video
                    src={firstMedia.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={firstMedia.url}
                    alt=""
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                  />
                )
              )}
              {/* Multiple media indicator */}
              {post.media && post.media.length > 1 && (
                <div className="absolute top-1.5 right-1.5 bg-black/50 rounded-full p-0.5">
                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="7" width="11" height="15" rx="2" />
                    <rect x="7" y="2" width="15" height="11" rx="2" />
                  </svg>
                </div>
              )}
              {isVideo && (
                <div className="absolute top-1.5 right-1.5 bg-black/50 rounded-full p-1">
                  <FontAwesomeIcon icon={faPlay} className="h-2.5 w-2.5 text-white" />
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <span className="text-white text-xs font-semibold flex items-center gap-1">
                  <FontAwesomeIcon icon={faHeart} className="h-3 w-3" />
                  {formatNumber(post.likes_count)}
                </span>
                <span className="text-white text-xs font-semibold flex items-center gap-1">
                  <FontAwesomeIcon icon={faComment} className="h-3 w-3" />
                  {formatNumber(post.comments_count)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isFetchingNextPage && <LoadingSpinner size="sm" />}
      </div>

      {/* Lightbox / Post preview modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card rounded-2xl overflow-hidden max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.media?.map((m, i) => (
              m.type === 'video' ? (
                <video key={i} src={m.url!} controls className="w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={m.url!} alt="" className="w-full object-contain" />
              )
            ))}
            <div className="p-4">
              <p className="text-sm whitespace-pre-wrap">{selected.content}</p>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span className={cn('flex items-center gap-1', selected.is_liked && 'text-red-500')}>
                  <FontAwesomeIcon icon={faHeart} className="h-3 w-3" /> {formatNumber(selected.likes_count)}
                </span>
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faComment} className="h-3 w-3" /> {formatNumber(selected.comments_count)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
