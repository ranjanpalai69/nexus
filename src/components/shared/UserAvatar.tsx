'use client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils/cn'
import { getInitials } from '@/lib/utils/helpers'
import type { Profile } from '@/types/database'

interface UserAvatarProps {
  user: Pick<Profile, 'full_name' | 'avatar_url' | 'username' | 'online_status'>
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showOnline?: boolean
  className?: string
}

const sizes = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

const dotSizes = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
}

export function UserAvatar({ user, size = 'md', showOnline = false, className }: UserAvatarProps) {
  return (
    <div className="relative inline-flex shrink-0">
      <Avatar className={cn(sizes[size], className)}>
        <AvatarImage src={user.avatar_url ?? undefined} alt={user.username} />
        <AvatarFallback>{getInitials(user.full_name || user.username)}</AvatarFallback>
      </Avatar>
      {showOnline && user.online_status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full bg-emerald-500 ring-2 ring-background',
            dotSizes[size]
          )}
        />
      )}
    </div>
  )
}
