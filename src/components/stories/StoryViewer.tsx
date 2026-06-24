'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark, faChevronLeft, faChevronRight, faEye, faPaperPlane, faHeart as faHeartSolid,
} from '@fortawesome/free-solid-svg-icons'
import { faHeart as faHeartOutline, faComment } from '@fortawesome/free-regular-svg-icons'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { timeAgo } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

interface StoryAuthor {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  online_status?: boolean | null
}

interface Story {
  id: string
  media_url: string
  media_type: string
  caption?: string | null
  views_count: number
  likes_count?: number
  created_at: string
  expires_at: string
  viewed?: boolean
  liked_by_me?: boolean
  author: StoryAuthor
}

interface StoryGroup {
  user: StoryAuthor & { is_verified?: boolean }
  stories: Story[]
  hasUnviewed: boolean
}

interface Viewer {
  viewed_at: string
  viewer: StoryAuthor
}

interface Comment {
  id: string
  content: string
  created_at: string
  user: StoryAuthor
}

interface Props {
  groups: StoryGroup[]
  initialGroupIndex: number
  onClose: () => void
}

const STORY_DURATION = 5000

export function StoryViewer({ groups, initialGroupIndex, onClose }: Props) {
  const currentUser = useAuthStore((s) => s.user)

  const [groupIdx, setGroupIdx] = useState(initialGroupIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)

  // Interaction state
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)

  // Panel state
  const [panel, setPanel] = useState<'none' | 'viewers' | 'comments'>('none')
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [panelLoading, setPanelLoading] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const elapsedRef = useRef<number>(0)

  const group = groups[groupIdx]
  const story = group?.stories[storyIdx]
  const isOwn = currentUser?.id === group?.user?.id
  const isPaused = paused || panel !== 'none' || inputFocused

  // Reset interaction state when story changes
  useEffect(() => {
    if (!story) return
    setLiked(story.liked_by_me ?? false)
    setLikesCount(story.likes_count ?? 0)
    setReplyText('')
    setInputFocused(false)
    setPanel('none')
    setViewers([])
    setComments([])
    elapsedRef.current = 0
    setProgress(0)
  }, [story?.id])

  const markViewed = useCallback(async (id: string) => {
    await fetch(`/api/stories/${id}/view`, { method: 'POST' }).catch(() => null)
  }, [])

  useEffect(() => {
    if (story) markViewed(story.id)
  }, [story?.id, markViewed])

  const advance = useCallback(() => {
    if (storyIdx < (group?.stories.length ?? 1) - 1) {
      setStoryIdx((i) => i + 1)
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1)
      setStoryIdx(0)
    } else {
      onClose()
    }
  }, [storyIdx, group, groupIdx, groups.length, onClose])

  const goBack = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1)
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1)
      setStoryIdx(0)
    }
  }, [storyIdx, groupIdx])

  // Progress timer
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    if (story?.media_type === 'video') return // video controls its own progress via onEnded

    startTimeRef.current = Date.now() - elapsedRef.current
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100)
      setProgress(pct)
      elapsedRef.current = elapsed
      if (elapsed >= STORY_DURATION) {
        clearInterval(timerRef.current!)
        advance()
      }
    }, 30)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPaused, storyIdx, groupIdx, advance, story?.media_type])

  // ── Like toggle ────────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (!story) return
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikesCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1)

    const res = await fetch(`/api/stories/${story.id}/like`, {
      method: wasLiked ? 'DELETE' : 'POST',
    }).catch(() => null)

    if (!res?.ok) {
      setLiked(wasLiked)
      setLikesCount((c) => wasLiked ? c + 1 : Math.max(0, c - 1))
    }
  }

  // ── Reply / inline comment ────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!replyText.trim() || !story || sendingReply) return
    const text = replyText.trim()
    setReplyText('')
    setSendingReply(true)
    const res = await fetch(`/api/stories/${story.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    }).catch(() => null)

    if (res?.ok) {
      toast.success('Reply sent!')
    } else {
      toast.error('Could not send reply')
    }
    setSendingReply(false)
  }

  // ── Viewers panel ──────────────────────────────────────────────────────────
  const openViewers = async () => {
    if (!story) return
    setPanelLoading(true)
    setPanel('viewers')
    const res = await fetch(`/api/stories/${story.id}/viewers`).catch(() => null)
    if (res?.ok) {
      const data = await res.json()
      setViewers(data.viewers ?? [])
    }
    setPanelLoading(false)
  }

  // ── Comments panel ─────────────────────────────────────────────────────────
  const openComments = async () => {
    if (!story) return
    setPanelLoading(true)
    setPanel('comments')
    const res = await fetch(`/api/stories/${story.id}/comments`).catch(() => null)
    if (res?.ok) {
      const data = await res.json()
      setComments(data.comments ?? [])
    }
    setPanelLoading(false)
  }

  const handlePanelComment = async () => {
    if (!commentInput.trim() || !story || sendingComment) return
    const text = commentInput.trim()
    setCommentInput('')
    setSendingComment(true)
    const res = await fetch(`/api/stories/${story.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    }).catch(() => null)

    if (res?.ok) {
      const data = await res.json()
      if (data.comment) setComments((c) => [...c, data.comment])
    } else {
      toast.error('Could not send comment')
    }
    setSendingComment(false)
  }

  const closePanel = () => setPanel('none')

  if (!group || !story) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">

      {/* ── Story card ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={story.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-sm h-full max-h-[100dvh] mx-auto flex flex-col"
        >
          {/* Media */}
          <div
            className="relative flex-1 overflow-hidden bg-black"
            onMouseDown={() => !inputFocused && setPaused(true)}
            onMouseUp={() => setPaused(false)}
            onTouchStart={() => !inputFocused && setPaused(true)}
            onTouchEnd={() => setPaused(false)}
          >
            {story.media_type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={story.media_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <video
                key={story.id}
                src={story.media_url}
                autoPlay
                muted
                playsInline
                onEnded={advance}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget
                  if (v.duration) setProgress((v.currentTime / v.duration) * 100)
                }}
                className="w-full h-full object-cover"
              />
            )}

            {/* Overlay gradient */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />

            {/* Progress bars */}
            <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
              {group.stories.map((s, i) => (
                <div key={s.id} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-none"
                    style={{
                      width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-6 left-3 right-3 flex items-center justify-between z-10">
              <Link
                href={`/profile/${story.author.username}`}
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <UserAvatar user={{ ...story.author, online_status: !!story.author.online_status }} size="sm" className="ring-2 ring-white" />
                <div>
                  <p className="text-white text-sm font-semibold drop-shadow">
                    {story.author.full_name || story.author.username}
                  </p>
                  <p className="text-white/70 text-xs">{timeAgo(story.created_at)}</p>
                </div>
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); onClose() }}
                className="text-white/80 hover:text-white p-1"
              >
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>

            {/* Caption */}
            {story.caption && (
              <div className="pointer-events-none absolute bottom-16 left-4 right-4 z-10">
                <p className="text-white text-sm drop-shadow text-center">{story.caption}</p>
              </div>
            )}

            {/* Interaction row: eye (own) + likes */}
            <div
              className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-10"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {isOwn ? (
                <button
                  onClick={openViewers}
                  className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
                >
                  <FontAwesomeIcon icon={faEye} className="h-5 w-5" />
                  <span className="text-sm">{story.views_count}</span>
                </button>
              ) : (
                <button
                  onClick={openComments}
                  className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
                >
                  <FontAwesomeIcon icon={faComment} className="h-5 w-5" />
                </button>
              )}

              <button
                onClick={handleLike}
                className="flex flex-col items-center gap-0.5"
              >
                <motion.div
                  key={liked ? 'liked' : 'unliked'}
                  initial={{ scale: liked ? 0.7 : 1 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                >
                  <FontAwesomeIcon
                    icon={liked ? faHeartSolid : faHeartOutline}
                    className={cn('h-6 w-6 drop-shadow', liked ? 'text-red-500' : 'text-white')}
                  />
                </motion.div>
                {likesCount > 0 && (
                  <span className="text-white text-xs leading-none">{likesCount}</span>
                )}
              </button>
            </div>

            {/* Left / Right tap zones */}
            <button
              className="absolute left-0 top-16 bottom-20 w-1/3"
              onClick={(e) => { e.stopPropagation(); goBack() }}
            />
            <button
              className="absolute right-0 top-16 bottom-20 w-1/3"
              onClick={(e) => { e.stopPropagation(); advance() }}
            />
          </div>

          {/* Reply input */}
          <div
            className="shrink-0 bg-black flex items-center gap-2 px-3 py-2.5"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <input
              className="flex-1 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/50 transition-colors"
              placeholder={`Reply to ${group.user.username}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => { setInputFocused(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply() }}
            />
            {replyText.trim() ? (
              <button
                onClick={handleSendReply}
                disabled={sendingReply}
                className="text-white hover:text-primary transition-colors shrink-0 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faPaperPlane} className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={openComments}
                className="text-white/60 hover:text-white transition-colors shrink-0"
              >
                <FontAwesomeIcon icon={faComment} className="h-5 w-5" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Left / Right group navigation arrows */}
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white flex items-center justify-center z-20"
        onClick={goBack}
      >
        <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
      </button>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white flex items-center justify-center z-20"
        onClick={advance}
      >
        <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
      </button>

      {/* Group dots */}
      {groups.length > 1 && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1 z-20 pointer-events-none">
          {groups.map((g, i) => (
            <div
              key={g.user.id}
              className={cn('h-1 rounded-full transition-all', i === groupIdx ? 'w-6 bg-white' : 'w-1 bg-white/40')}
            />
          ))}
        </div>
      )}

      {/* ── Bottom panel (viewers or comments) ─────────────────── */}
      <AnimatePresence>
        {panel !== 'none' && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30"
              onClick={closePanel}
            />

            {/* Sheet */}
            <motion.div
              key="panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-card shadow-xl flex flex-col"
              style={{ maxHeight: '65vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <h3 className="font-semibold text-sm">
                  {panel === 'viewers'
                    ? `Viewers${viewers.length ? ` (${viewers.length})` : ''}`
                    : 'Comments'}
                </h3>
                <button onClick={closePanel} className="text-muted-foreground hover:text-foreground">
                  <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                </button>
              </div>

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {panelLoading && (
                  <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
                )}

                {/* Viewers list */}
                {panel === 'viewers' && !panelLoading && (
                  <>
                    {viewers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No viewers yet</p>
                    ) : (
                      viewers.map((v) => (
                        <div key={v.viewer.id} className="flex items-center gap-3 py-2 rounded-lg hover:bg-accent px-2">
                          <UserAvatar user={{ ...v.viewer, online_status: !!v.viewer.online_status }} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {v.viewer.full_name || v.viewer.username}
                            </p>
                            <p className="text-xs text-muted-foreground">@{v.viewer.username}</p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{timeAgo(v.viewed_at)}</span>
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* Comments list */}
                {panel === 'comments' && !panelLoading && (
                  <>
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first!</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="flex items-start gap-3 py-2 px-2">
                          <UserAvatar user={{ ...c.user, online_status: !!c.user.online_status }} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-semibold">{c.user.username}</span>{' '}
                              <span className="text-foreground">{c.content}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(c.created_at)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>

              {/* Comment input (only in comments panel) */}
              {panel === 'comments' && (
                <div className="shrink-0 border-t border-border px-3 py-2.5 flex items-center gap-2">
                  <UserAvatar user={currentUser!} size="xs" />
                  <input
                    className="flex-1 rounded-full border border-border bg-muted/50 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                    placeholder="Add a comment…"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePanelComment() }}
                  />
                  <button
                    onClick={handlePanelComment}
                    disabled={!commentInput.trim() || sendingComment}
                    className="text-primary hover:text-primary/80 disabled:opacity-40 transition-colors shrink-0"
                  >
                    <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
