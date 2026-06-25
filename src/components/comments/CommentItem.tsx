import { VerifiedBadge } from '@/components/shared/VerifiedBadge'
import { useState, useEffect } from 'react'
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
import { getSocket } from '@/lib/socket/client'
import { motion, AnimatePresence } from 'framer-motion'
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

  // Real-time: sync like count from other users' actions
  useEffect(() => {
    if (!user) return
    const socket = getSocket(user.id)

    const handler = (data: { commentId: string; userId: string; likesCount: number }) => {
      if (data.commentId === comment.id && data.userId !== user.id) {
        setLikeCount(data.likesCount)
      }
    }

    socket.on('comment:like_update', handler)
    return () => { socket.off('comment:like_update', handler) }
  }, [user, comment.id])

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

  const replies: CommentWithDetails[] = repliesData?.comments ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-2', depth > 0 && 'ml-8 mt-2')}
    >
      <Link href={`/profile/${comment.author.username}`} className="shrink-0 mt-0.5">
        <UserAvatar user={comment.author} size="xs" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="rounded-xl bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profile/${comment.author.username}`} className="text-xs font-semibold hover:underline">
              {comment.author.full_name || comment.author.username}
            </Link>
            {comment.author.is_verified && <VerifiedBadge className="h-3 w-3" />}
            <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
        </div>

        <div className="flex items-center gap-3 mt-1 px-1">
          <button
            onClick={handleLike}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors',
              liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
            )}
          >
            <motion.span
              key={liked ? 'liked' : 'unliked'}
              initial={{ scale: liked ? 1.4 : 1 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <FontAwesomeIcon icon={liked ? faHeartSolid : faHeartRegular} className="h-3 w-3" />
            </motion.span>
            <AnimatePresence mode="wait">
              <motion.span
                key={likeCount}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 3 }}
                transition={{ duration: 0.12 }}
                className="tabular-nums"
              >
                {likeCount > 0 ? likeCount : ''}
              </motion.span>
            </AnimatePresence>
          </button>

          {depth === 0 && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Reply
            </button>
          )}

          {comment.replies_count > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <FontAwesomeIcon icon={showReplies ? faChevronUp : faChevronDown} className="h-2.5 w-2.5" />
              {showReplies ? 'Hide replies' : `${comment.replies_count} repl${comment.replies_count === 1 ? 'y' : 'ies'}`}
            </button>
          )}
        </div>

        <AnimatePresence>
          {showReply && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReplies && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-1 space-y-1 border-l-2 border-border/50 pl-2"
            >
              {replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
              ))}
              {replies.length === 0 && showReplies && (
                <p className="text-xs text-muted-foreground py-2 pl-2">No replies yet</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
