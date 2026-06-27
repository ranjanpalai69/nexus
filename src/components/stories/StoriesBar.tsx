'use client'
import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { StoryViewer } from './StoryViewer'
import { StoryUpload } from './StoryUpload'
import { AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils/cn'

interface StoryGroup {
  user: { id: string; username: string; full_name: string | null; avatar_url: string | null; is_verified?: boolean; online_status: boolean }
  stories: { id: string; media_url: string; media_type: string; caption?: string | null; views_count: number; likes_count?: number; liked_by_me?: boolean; created_at: string; expires_at: string; viewed?: boolean; author: { id: string; username: string; full_name: string | null; avatar_url: string | null; online_status?: boolean } }[]
  hasUnviewed: boolean
}

export function StoriesBar() {
  const user = useAuthStore((s) => s.user)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerGroup, setViewerGroup] = useState(0)
  const [uploadOpen, setUploadOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, refetch } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const res = await fetch('/api/stories')
      return res.json()
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })

  const groups: StoryGroup[] = data?.groups ?? []
  const hasOwnStory = groups.some((g) => g.user.id === user?.id)

  const openViewer = (idx: number) => {
    setViewerGroup(idx)
    setViewerOpen(true)
  }

  // Don't render bar if nothing to show and no upload option
  if (!user) return null

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-3">
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {/* Add story button */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <button
              onClick={() => setUploadOpen(true)}
              className="relative h-16 w-16 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center bg-muted"
            >
              <UserAvatar user={user} size="lg" className="h-16 w-16 opacity-70" />
              <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                <FontAwesomeIcon icon={faPlus} className="h-2.5 w-2.5 text-white" />
              </div>
            </button>
            <span className="text-[10px] text-muted-foreground font-medium">Your Story</span>
          </div>

          {/* Story groups */}
          {groups.map((group, idx) => {
            const isOwn = group.user.id === user.id
            return (
              <div key={group.user.id} className="flex flex-col items-center gap-1 shrink-0">
                <button
                  onClick={() => openViewer(idx)}
                  className={cn(
                    'h-16 w-16 rounded-full p-0.5 transition-all',
                    group.hasUnviewed
                      ? 'nexus-gradient'
                      : 'bg-muted'
                  )}
                >
                  <div className="h-full w-full rounded-full border-2 border-card overflow-hidden">
                    <UserAvatar user={group.user} size="lg" className="h-full w-full" />
                  </div>
                </button>
                <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[68px] text-center">
                  {isOwn ? 'You' : (group.user.full_name?.split(' ')[0] ?? group.user.username)}
                </span>
              </div>
            )
          })}

          {groups.length === 0 && !hasOwnStory && (
            <p className="text-xs text-muted-foreground self-center ml-2">No stories yet — be the first!</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {viewerOpen && groups.length > 0 && (
          <StoryViewer
            groups={groups}
            initialGroupIndex={viewerGroup}
            onClose={() => { setViewerOpen(false); refetch() }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadOpen && (
          <StoryUpload
            onClose={() => setUploadOpen(false)}
            onSuccess={() => { setUploadOpen(false); refetch() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
