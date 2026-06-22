'use client'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faComment, faUserPlus, faBell } from '@fortawesome/free-solid-svg-icons'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { timeAgo } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import { useNotificationStore } from '@/store/notificationStore'
import type { NotificationWithActor } from '@/types/database'

const icons = {
  like_post: { icon: faHeart, color: 'text-red-500 bg-red-500/10' },
  like_comment: { icon: faHeart, color: 'text-red-500 bg-red-500/10' },
  comment: { icon: faComment, color: 'text-blue-500 bg-blue-500/10' },
  reply: { icon: faComment, color: 'text-blue-500 bg-blue-500/10' },
  follow: { icon: faUserPlus, color: 'text-violet-500 bg-violet-500/10' },
  mention: { icon: faBell, color: 'text-amber-500 bg-amber-500/10' },
  message: { icon: faComment, color: 'text-indigo-500 bg-indigo-500/10' },
}

const messages = {
  like_post: 'liked your post',
  like_comment: 'liked your comment',
  comment: 'commented on your post',
  reply: 'replied to your comment',
  follow: 'started following you',
  mention: 'mentioned you',
  message: 'sent you a message',
}

function getHref(n: NotificationWithActor): string {
  if (n.type === 'follow') return `/profile/${n.actor?.username}`
  if (n.type === 'message') return `/messages/${n.reference_id}`
  if (n.reference_type === 'post') return `/post/${n.reference_id}`
  if (n.reference_type === 'comment') return `/post/${n.reference_id}`
  return '#'
}

export function NotificationItem({ notification }: { notification: NotificationWithActor }) {
  const { markRead } = useNotificationStore()

  const handleClick = async () => {
    if (!notification.is_read) {
      markRead(notification.id)
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] }),
      })
    }
  }

  const config = icons[notification.type]
  const href = getHref(notification)

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-accent',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className="relative shrink-0">
        {notification.actor && <UserAvatar user={notification.actor} size="md" />}
        <div className={cn('absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center', config.color)}>
          <FontAwesomeIcon icon={config.icon} className="h-2.5 w-2.5" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{notification.actor?.full_name || notification.actor?.username}</span>
          {' '}{messages[notification.type]}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(notification.created_at)}</p>
      </div>
      {!notification.is_read && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
      )}
    </Link>
  )
}
