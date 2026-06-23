'use client'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CommentItem } from './CommentItem'
import { CommentInput } from './CommentInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import { getSocket } from '@/lib/socket/client'
import type { CommentWithDetails } from '@/types/database'

interface CommentSectionProps {
  postId: string
}

export function CommentSection({ postId }: CommentSectionProps) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/comments`)
      return res.json()
    },
    staleTime: 30 * 1000,
  })

  const comments: CommentWithDetails[] = data?.comments ?? []

  // Real-time: listen for new comments on this post
  useEffect(() => {
    if (!user) return
    const socket = getSocket(user.id)

    const handleCommentNew = (evt: {
      postId: string
      comment: CommentWithDetails
      parentId: string | null
    }) => {
      if (evt.postId !== postId) return
      if (evt.comment.user_id === user.id) return // commenter sees it via query invalidation

      if (!evt.parentId) {
        // Top-level comment — append to main list
        queryClient.setQueryData(['comments', postId], (old: { comments: CommentWithDetails[]; nextCursor: string | null } | undefined) => {
          if (!old) return old
          if (old.comments.some((c) => c.id === evt.comment.id)) return old
          return { ...old, comments: [...old.comments, evt.comment] }
        })
      } else {
        // Reply — append to parent's replies cache if already loaded
        queryClient.setQueryData(['comments', postId, evt.parentId], (old: { comments: CommentWithDetails[] } | undefined) => {
          if (!old) return old
          if (old.comments.some((c) => c.id === evt.comment.id)) return old
          return { ...old, comments: [...old.comments, evt.comment] }
        })
        // Increment parent's replies_count in the main list
        queryClient.setQueryData(['comments', postId], (old: { comments: CommentWithDetails[]; nextCursor: string | null } | undefined) => {
          if (!old) return old
          return {
            ...old,
            comments: old.comments.map((c) =>
              c.id === evt.parentId ? { ...c, replies_count: (c.replies_count ?? 0) + 1 } : c
            ),
          }
        })
      }
    }

    socket.on('post:comment_new', handleCommentNew)
    return () => { socket.off('post:comment_new', handleCommentNew) }
  }, [user, postId, queryClient])

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
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Be the first to comment</p>
          )}
        </div>
      )}
    </div>
  )
}
