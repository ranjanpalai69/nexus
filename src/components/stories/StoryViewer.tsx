'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faChevronLeft, faChevronRight, faEye } from '@fortawesome/free-solid-svg-icons'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { timeAgo } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'

interface Story {
  id: string
  media_url: string
  media_type: string
  caption?: string | null
  views_count: number
  created_at: string
  expires_at: string
  viewed?: boolean
  author: { id: string; username: string; full_name: string | null; avatar_url: string | null; online_status: boolean }
}

interface StoryGroup {
  user: Story['author']
  stories: Story[]
  hasUnviewed: boolean
}

interface StoryViewerProps {
  groups: StoryGroup[]
  initialGroupIndex: number
  onClose: () => void
}

const STORY_DURATION = 5000

export function StoryViewer({ groups, initialGroupIndex, onClose }: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const elapsedRef = useRef<number>(0)

  const group = groups[groupIdx]
  const story = group?.stories[storyIdx]

  const markViewed = useCallback(async (id: string) => {
    await fetch(`/api/stories/${id}/view`, { method: 'POST' }).catch(() => null)
  }, [])

  const advance = useCallback(() => {
    if (storyIdx < (group?.stories.length ?? 1) - 1) {
      setStoryIdx((i) => i + 1)
      setProgress(0)
      elapsedRef.current = 0
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1)
      setStoryIdx(0)
      setProgress(0)
      elapsedRef.current = 0
    } else {
      onClose()
    }
  }, [storyIdx, group, groupIdx, groups.length, onClose])

  const goBack = () => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1)
      setProgress(0)
      elapsedRef.current = 0
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1)
      setStoryIdx(0)
      setProgress(0)
      elapsedRef.current = 0
    }
  }

  // Mark viewed when story changes
  useEffect(() => {
    if (story) markViewed(story.id)
  }, [story?.id, markViewed])

  // Progress timer
  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
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
  }, [paused, storyIdx, groupIdx, advance])

  if (!group || !story) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* Story content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={story.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm h-full max-h-[100dvh] mx-auto flex items-center"
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
              className="w-full h-full object-cover"
            />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 pointer-events-none" />

          {/* Progress bars */}
          <div className="absolute top-3 left-3 right-3 flex gap-1">
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
          <div className="absolute top-6 left-3 right-3 flex items-center justify-between">
            <Link href={`/profile/${story.author.username}`} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <UserAvatar user={story.author} size="sm" className="ring-2 ring-white" />
              <div>
                <p className="text-white text-sm font-semibold drop-shadow">{story.author.full_name || story.author.username}</p>
                <p className="text-white/70 text-xs">{timeAgo(story.created_at)}</p>
              </div>
            </Link>
            <button onClick={(e) => { e.stopPropagation(); onClose() }} className="text-white/80 hover:text-white p-1">
              <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
            </button>
          </div>

          {/* Caption */}
          {story.caption && (
            <div className="absolute bottom-8 left-4 right-4">
              <p className="text-white text-sm drop-shadow text-center">{story.caption}</p>
            </div>
          )}

          {/* Views count */}
          <div className="absolute bottom-3 right-4 flex items-center gap-1 text-white/60 text-xs">
            <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
            {story.views_count}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons */}
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white flex items-center justify-center"
        onClick={(e) => { e.stopPropagation(); goBack() }}
      >
        <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
      </button>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white flex items-center justify-center"
        onClick={(e) => { e.stopPropagation(); advance() }}
      >
        <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
      </button>

      {/* Group navigation dots */}
      {groups.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
          {groups.map((g, i) => (
            <div key={(g.user as {id:string}).id} className={cn('h-1 rounded-full transition-all', i === groupIdx ? 'w-6 bg-white' : 'w-1 bg-white/40')} />
          ))}
        </div>
      )}
    </div>
  )
}
