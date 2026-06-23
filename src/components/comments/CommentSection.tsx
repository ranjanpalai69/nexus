'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CommentItem } from './CommentItem'
import { CommentInput } from './CommentInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { CommentWithDetails } from '@/types/database'

interface CommentSectionProps {
  postId: string
}

export function CommentSection({ postId }: CommentSectionProps) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/comments`)
      return res.json()
    },
    staleTime: 30 * 1000,
  })

  const comments: CommentWithDetails[] = data?.comments ?? []

  const handleNewComment = () => {
    queryClient.invalidateQueries({ queryKey: ['comments', postId] })
  }

  return (
    <div className="border-t border-border pt-3 space-y-3">
      <CommentInput postId={postId} onSuccess={handleNewComment} />
      {isLoading ? (
        <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} postId={postId} />
          ))}
        </div>
      )}
    </div>
  )
}
