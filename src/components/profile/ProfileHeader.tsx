'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLink, faLocationDot, faPen, faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { faCalendar } from '@fortawesome/free-regular-svg-icons'
import { useAuthStore } from '@/store/authStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { formatNumber, formatFullDate } from '@/lib/utils/helpers'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/database'

interface ProfileHeaderProps {
  profile: Profile & { is_following?: boolean; is_own?: boolean; is_followed_by?: boolean }
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const router = useRouter()
  const [following, setFollowing] = useState(profile.is_following ?? false)
  const [followLoading, setFollowLoading] = useState(false)
  const [messageLoading, setMessageLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(profile.followers_count)

  const handleFollow = async () => {
    if (!currentUser) return
    setFollowLoading(true)
    const prev = following
    setFollowing(!prev)
    setFollowerCount((c) => c + (prev ? -1 : 1))
    try {
      const res = await fetch(`/api/users/${profile.username}/follow`, { method: 'POST' })
      if (!res.ok) {
        setFollowing(prev)
        setFollowerCount((c) => c + (prev ? 1 : -1))
        toast.error('Failed to follow')
      } else {
        queryClient.invalidateQueries({ queryKey: ['profile', profile.username] })
      }
    } catch {
      setFollowing(prev)
      setFollowerCount((c) => c + (prev ? 1 : -1))
    } finally {
      setFollowLoading(false)
    }
  }

  const handleMessage = async () => {
    if (!currentUser) return
    setMessageLoading(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: profile.id }),
      })
      if (!res.ok) { toast.error('Could not open conversation'); return }
      const data = await res.json()
      if (data.conversation?.id) {
        router.push(`/messages/${data.conversation.id}`)
      } else {
        toast.error('Could not start conversation')
      }
    } catch {
      toast.error('Failed to open message')
    } finally {
      setMessageLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Cover */}
      <div className="h-40 md:h-52 bg-gradient-to-br from-orange-950 via-purple-950 to-cyan-950 relative">
        {profile.cover_url && (
          <Image src={profile.cover_url} alt="Cover" fill className="object-cover" />
        )}
      </div>

      {/* Avatar & Actions */}
      <div className="px-4 md:px-6">
        <div className="flex items-end justify-between -mt-10 md:-mt-14 mb-4">
          <div className="ring-4 ring-card rounded-full">
            <UserAvatar user={profile} size="xl" showOnline className="ring-4 ring-card" />
          </div>
          <div className="flex gap-2 mt-2 flex-wrap justify-end">
            {profile.is_own ? (
              <Link href="/settings/profile">
                <Button variant="outline" size="sm" className="gap-2 h-8 sm:h-9">
                  <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Edit Profile</span>
                  <span className="xs:hidden">Edit</span>
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 sm:h-9"
                  onClick={handleMessage}
                  loading={messageLoading}
                >
                  <FontAwesomeIcon icon={faPaperPlane} className="h-3 w-3" />
                  <span className="hidden sm:inline">Message</span>
                </Button>
                <Button
                  variant={following ? 'outline' : 'gradient'}
                  size="sm"
                  className="h-8 sm:h-9"
                  onClick={handleFollow}
                  loading={followLoading}
                >
                  {following ? 'Unfollow' : profile.is_followed_by ? 'Follow Back' : 'Follow'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="pb-5 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{profile.full_name || profile.username}</h1>
              {profile.is_verified && <span className="text-primary text-sm">✓</span>}
            </div>
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          </div>

          {profile.bio && <p className="text-sm leading-relaxed">{profile.bio}</p>}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {profile.location && (
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3" />
                {profile.location}
              </span>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <FontAwesomeIcon icon={faLink} className="h-3 w-3" />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="flex items-center gap-1">
              <FontAwesomeIcon icon={faCalendar} className="h-3 w-3" />
              Joined {formatFullDate(profile.created_at)}
            </span>
          </div>

          <div className="flex gap-4 sm:gap-6 text-sm flex-wrap">
            <Link href={`/profile/${profile.username}/following`} className="hover:underline">
              <span className="font-bold">{formatNumber(profile.following_count)}</span>
              <span className="text-muted-foreground ml-1 text-xs sm:text-sm">Following</span>
            </Link>
            <Link href={`/profile/${profile.username}/followers`} className="hover:underline">
              <span className="font-bold">{formatNumber(followerCount)}</span>
              <span className="text-muted-foreground ml-1 text-xs sm:text-sm">Followers</span>
            </Link>
            <span>
              <span className="font-bold">{formatNumber(profile.posts_count)}</span>
              <span className="text-muted-foreground ml-1 text-xs sm:text-sm">Posts</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
