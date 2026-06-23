'use client'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { PostCard } from '@/components/feed/PostCard'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import type { PostWithDetails } from '@/types/database'

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>()
  const router = useRouter()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}`)
      if (!res.ok) throw new Error('Post not found')
      return res.json()
    },
    staleTime: 30 * 1000,
  })

  const post: PostWithDetails | undefined = data?.post

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">Post</h1>
      </div>

      {isLoading && <PageLoader />}

      {isError && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
          <p className="font-medium">Post not found</p>
          <p className="text-sm mt-1 opacity-60">It may have been deleted.</p>
        </div>
      )}

      {post && (
        <PostCard
          post={post}
          defaultOpenComments
        />
      )}
    </div>
  )
}
