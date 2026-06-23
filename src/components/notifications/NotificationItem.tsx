'use client'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faComment, faUserPlus, faBell, faMessage } from '@fortawesome/free-solid-svg-icons'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { timeAgo } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/cn'
import { useNotificationStore } from '@/store/notificationStore'
import type { NotificationWithActor } from '@/types/database'

const icons = {
  like_post:    { icon: faHeart,    color: 'text-red-500 bg-red-500/10' },
  like_comment: { icon: faHeart,    color: 'text-red-500 bg-red-500/10' },
  comment:      { icon: faComment,  color: 'text-blue-500 bg-blue-500/10' },
  reply:        { icon: faComment,  color: 'text-indigo-500 bg-indigo-500/10' },
  follow:       { icon: faUserPlus, color: 'text-violet-500 bg-violet-500/10' },
  mention:      { icon: faBell,     color: 'text-amber-500 bg-amber-500/10' },
  message:      { icon: faMessage,  color: 'text-indigo-500 bg-indigo-500/10' },
}

const labels: Record<string, string> = {
  like_post:    'liked your post',
  like_comment: 'liked your comment',
  comment:      'commented on your post',
  reply:        'replied to your comment',
  follow:       'started following you',
  mention:      'mentioned you in a comment',
  message:      'sent you a message',
  repost:       'reposted your post',
}

function getHref(n: NotificationWithActor): string {
  switch (n.type) {
    case 'follow':
      return `/profile/${n.actor?.username}`
    case 'message':
      // reference_id for message notifications is the conversation_id
      return `/messages/${n.reference_id}`
    case 'like_post':
      // reference_type === 'post', reference_id === post_id
      return n.reference_id ? `/post/${n.reference_id}` : '#'
    case 'comment':
    case 'reply':
    case 'like_comment':
    case 'mention':
      // reference_id is comment_id; post_id is enriched by the API / socket
      if (n.post_id) return `/post/${n.post_id}`
      // fallback: if somehow post_id missing (old notifications), go to actor profile
      return n.actor?.username ? `/profile/${n.actor.username}` : '#'
    default:
      return '#'
  }
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
      }).catch(() => {})
    }
  }

  const config = icons[notification.type] ?? icons.comment
  const href = getHref(notification)

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-accent',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className="relative shrink-0 mt-0.5">
        {notification.actor && <UserAvatar user={notification.actor} size="md" />}
        <div className={cn('absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center', config.color)}>
          <FontAwesomeIcon icon={config.icon} className="h-2.5 w-2.5" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold">
            {notification.actor?.full_name || notification.actor?.username}
          </span>
          {' '}{labels[notification.type] ?? 'interacted with you'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(notification.created_at)}</p>
      </div>

      {!notification.is_read && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
      )}
    </Link>
  )
}
