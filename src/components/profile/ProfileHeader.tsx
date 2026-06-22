'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLink, faLocationDot, faPen } from '@fortawesome/free-solid-svg-icons'
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
  const [following, setFollowing] = useState(profile.is_following ?? false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(profile.followers_count)

  const handleFollow = async () => {
    if (!currentUser) return
    setFollowLoading(true)
    const prev = following
    setFollowing(!prev)
    setFollowerCount((c) => c + (prev ? -1 : 1))
    try {
      const res = await fetch(`/api/users/${profile.username}/follow`, { method: 'POST' })
      if (!res.ok) { setFollowing(prev); setFollowerCount((c) => c + (prev ? 1 : -1)); toast.error('Failed') }
      else queryClient.invalidateQueries({ queryKey: ['profile', profile.username] })
    } catch {
      setFollowing(prev); setFollowerCount((c) => c + (prev ? 1 : -1))
    } finally {
      setFollowLoading(false)
    }
  }

  const handleMessage = async () => {
    if (!currentUser) return
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: profile.id }),
    })
    const data = await res.json()
    if (data.conversation) window.location.href = `/messages/${data.conversation.id}`
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Cover */}
      <div className="h-40 md:h-52 bg-gradient-to-br from-indigo-900 via-violet-900 to-purple-900 relative">
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
          <div className="flex gap-2 mt-2">
            {profile.is_own ? (
              <Link href="/settings/profile">
                <Button variant="outline" size="sm" className="gap-2">
                  <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
              </Link>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleMessage}>Message</Button>
                <Button
                  variant={following ? 'outline' : 'gradient'}
                  size="sm"
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

          <div className="flex gap-5 text-sm">
            <Link href={`/profile/${profile.username}/following`} className="hover:underline">
              <span className="font-bold">{formatNumber(profile.following_count)}</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </Link>
            <Link href={`/profile/${profile.username}/followers`} className="hover:underline">
              <span className="font-bold">{formatNumber(followerCount)}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </Link>
            <span>
              <span className="font-bold">{formatNumber(profile.posts_count)}</span>
              <span className="text-muted-foreground ml-1">Posts</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
