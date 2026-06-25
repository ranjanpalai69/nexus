'use client'

import { VerifiedBadge } from '@/components/shared/VerifiedBadge'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart as faHeartSolid, faComment, faShare, faEllipsis, faTrash, faBookmark as faBookmarkSolid } from '@fortawesome/free-solid-svg-icons'
import { faHeart as faHeartRegular, faBookmark as faBookmarkRegular } from '@fortawesome/free-regular-svg-icons'
import { useAuthStore } from '@/store/authStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CommentSection } from '@/components/comments/CommentSection'
import { useUIStore } from '@/store/uiStore'
import { timeAgo, formatNumber } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '@/lib/socket/client'
import { RenderWithMentions } from '@/components/shared/MentionTextarea'
import { MediaCarousel } from '@/components/shared/MediaCarousel'
import type { PostWithDetails } from '@/types/database'

interface PostCardProps {
  post: PostWithDetails
  onDelete?: () => void
  defaultOpenComments?: boolean
}

export function PostCard({ post, onDelete, defaultOpenComments = false }: PostCardProps) {
  const user = useAuthStore((s) => s.user)
  const { openMediaViewer } = useUIStore()
  const queryClient = useQueryClient()
  const [liked, setLiked] = useState(post.is_liked ?? false)
  const [likeCount, setLikeCount] = useState(post.likes_count)
  const [commentCount, setCommentCount] = useState(post.comments_count)
  const [saved, setSaved] = useState((post as PostWithDetails & { is_saved?: boolean }).is_saved ?? false)
  const [showComments, setShowComments] = useState(defaultOpenComments)
  const [liking, setLiking] = useState(false)
  const [saving, setSaving] = useState(false)
  const isOwn = user?.id === post.user_id

  // Real-time: join post room
  useEffect(() => {
    if (!user) return
    const socket = getSocket(user.id)
    socket.emit('post:join', { postId: post.id })

    const handleLikeUpdate = (data: { postId: string; userId: string; liked: boolean; likesCount: number }) => {
      if (data.postId !== post.id || data.userId === user.id) return
      setLikeCount(data.likesCount)
    }
    const handleCommentCountUpdate = (data: { postId: string; commentsCount: number }) => {
      if (data.postId === post.id) setCommentCount(data.commentsCount)
    }

    socket.on('post:like_update', handleLikeUpdate)
    socket.on('post:comment_count_update', handleCommentCountUpdate)
    return () => {
      socket.emit('post:leave', { postId: post.id })
      socket.off('post:like_update', handleLikeUpdate)
      socket.off('post:comment_count_update', handleCommentCountUpdate)
    }
  }, [user, post.id])

  const handleLike = async () => {
    if (!user || liking) return
    setLiking(true)
    const prev = liked
    setLiked(!prev)
    setLikeCount((c) => c + (prev ? -1 : 1))
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
      if (!res.ok) { setLiked(prev); setLikeCount((c) => c + (prev ? 1 : -1)) }
    } catch {
      setLiked(prev); setLikeCount((c) => c + (prev ? 1 : -1))
    } finally { setLiking(false) }
  }

  const handleSave = async () => {
    if (!user || saving) return
    setSaving(true)
    const prev = saved
    setSaved(!prev)
    try {
      const res = await fetch(`/api/posts/${post.id}/save`, { method: 'POST' })
      if (!res.ok) { setSaved(prev); toast.error('Failed to save') }
      else toast.success(prev ? 'Post unsaved' : 'Post saved!', { id: 'save', duration: 1500 })
    } catch {
      setSaved(prev)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Failed to delete'); return }
      toast.success('Post deleted')
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      onDelete?.()
    } catch { toast.error('Failed') }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    try { await navigator.clipboard.writeText(url); toast.success('Link copied!') }
    catch { toast.error('Could not copy') }
  }

  const sortedMedia = [...(post.media ?? [])].sort((a, b) => a.order_index - b.order_index)

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4 space-y-3 hover:border-border/80 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <Link href={`/profile/${post.author.username}`} className="flex items-center gap-3 group">
          <UserAvatar user={post.author} size="md" />
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold group-hover:underline">{post.author.full_name || post.author.username}</span>
              {post.author.is_verified && <VerifiedBadge />}
            </div>
            <p className="text-xs text-muted-foreground">@{post.author.username} · {timeAgo(post.created_at)}</p>
          </div>
        </Link>
        {isOwn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                <FontAwesomeIcon icon={faEllipsis} className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem destructive onClick={handleDelete}>
                <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <RenderWithMentions text={post.content} className="text-sm leading-relaxed whitespace-pre-wrap" />
      )}

      {/* Media */}
      {sortedMedia.length > 0 && (
        <MediaCarousel
          items={sortedMedia.map((m) => ({ id: m.id, url: m.url, type: m.type as 'image' | 'video' }))}
          onImageClick={openMediaViewer}
          aspectRatio="video"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10', liked && 'text-red-500')}
          onClick={handleLike}
        >
          <motion.span
            key={liked ? 'liked' : 'unliked'}
            initial={{ scale: liked ? 1.4 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="flex items-center"
          >
            <FontAwesomeIcon icon={liked ? faHeartSolid : faHeartRegular} className="h-4 w-4" />
          </motion.span>
          <AnimatePresence mode="wait">
            <motion.span
              key={likeCount}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="text-xs tabular-nums"
            >
              {formatNumber(likeCount)}
            </motion.span>
          </AnimatePresence>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
          onClick={() => setShowComments(!showComments)}
        >
          <FontAwesomeIcon icon={faComment} className="h-4 w-4" />
          <AnimatePresence mode="wait">
            <motion.span
              key={commentCount}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="text-xs tabular-nums"
            >
              {formatNumber(commentCount)}
            </motion.span>
          </AnimatePresence>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
          onClick={handleShare}
        >
          <FontAwesomeIcon icon={faShare} className="h-4 w-4" />
        </Button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'ml-auto flex items-center justify-center h-8 w-8 rounded-lg transition-colors',
            saved
              ? 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10'
              : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
          )}
          title={saved ? 'Unsave post' : 'Save post'}
        >
          <motion.span
            key={saved ? 'saved' : 'unsaved'}
            initial={{ scale: saved ? 1.3 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <FontAwesomeIcon icon={saved ? faBookmarkSolid : faBookmarkRegular} className="h-4 w-4" />
          </motion.span>
        </motion.button>
      </div>

      {/* Comments */}
      {showComments && <CommentSection postId={post.id} />}
    </motion.article>
  )
}
