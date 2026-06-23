'use client'
import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart as faHeartSolid, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons'
import { useAuthStore } from '@/store/authStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { CommentInput } from './CommentInput'
import { timeAgo } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { CommentWithDetails } from '@/types/database'

interface CommentItemProps {
  comment: CommentWithDetails
  postId: string
  depth?: number
}

export function CommentItem({ comment, postId, depth = 0 }: CommentItemProps) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [liked, setLiked] = useState(comment.is_liked ?? false)
  const [likeCount, setLikeCount] = useState(comment.likes_count)
  const [showReply, setShowReply] = useState(false)
  const [showReplies, setShowReplies] = useState(false)

  const { data: repliesData } = useQuery({
    queryKey: ['comments', postId, comment.id],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/comments?parentId=${comment.id}`)
      return res.json()
    },
    enabled: showReplies,
  })

  const handleLike = async () => {
    if (!user) return
    const prev = liked
    setLiked(!prev)
    setLikeCount((c) => c + (prev ? -1 : 1))
    try {
      await fetch(`/api/posts/${postId}/comments/${comment.id}/like`, { method: 'POST' })
    } catch {
      setLiked(prev)
      setLikeCount((c) => c + (prev ? 1 : -1))
    }
  }

  return (
    <div className={cn('flex gap-2', depth > 0 && 'ml-8')}>
      <Link href={`/profile/${comment.author.username}`} className="shrink-0 mt-0.5">
        <UserAvatar user={comment.author} size="xs" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="rounded-xl bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profile/${comment.author.username}`} className="text-xs font-semibold hover:underline">
              {comment.author.full_name || comment.author.username}
            </Link>
            <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm mt-0.5 whitespace-pre-wrap">{comment.content}</p>
        </div>
        <div className="flex items-center gap-2 mt-1 px-1">
          <button
            onClick={handleLike}
            className={cn('flex items-center gap-1 text-xs transition-colors', liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500')}
          >
            <FontAwesomeIcon icon={liked ? faHeartSolid : faHeartRegular} className="h-3 w-3" />
            {likeCount > 0 && likeCount}
          </button>
          {depth === 0 && (
            <button onClick={() => setShowReply(!showReply)} className="text-xs text-muted-foreground hover:text-foreground">
              Reply
            </button>
          )}
          {comment.replies_count > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <FontAwesomeIcon icon={showReplies ? faChevronUp : faChevronDown} className="h-2.5 w-2.5" />
              {showReplies ? 'Hide' : `${comment.replies_count} repl${comment.replies_count === 1 ? 'y' : 'ies'}`}
            </button>
          )}
        </div>

        {showReply && (
          <div className="mt-2">
            <CommentInput
              postId={postId}
              parentId={comment.id}
              onSuccess={() => {
                setShowReply(false)
                setShowReplies(true)
                queryClient.invalidateQueries({ queryKey: ['comments', postId, comment.id] })
              }}
              onCancel={() => setShowReply(false)}
              placeholder={`Reply to @${comment.author.username}...`}
            />
          </div>
        )}

        {showReplies && repliesData?.comments?.map((reply: CommentWithDetails) => (
          <div key={reply.id} className="mt-2">
            <CommentItem comment={reply} postId={postId} depth={depth + 1} />
          </div>
        ))}
      </div>
    </div>
  )
}
