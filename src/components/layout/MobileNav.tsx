'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faBell, faMessage, faUser, faPlus } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils/cn'
import { useNotificationStore } from '@/store/notificationStore'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

export function MobileNav() {
  const pathname = usePathname()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const unreadMessages = useChatStore((s) =>
    s.conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)
  )
  const { setCreatePostOpen } = useUIStore()
  const user = useAuthStore((s) => s.user)

  const navLink = (href: string, icon: typeof faHouse, count?: number, color?: string) => {
    const active = pathname === href || (href !== '/feed' && pathname.startsWith(href))
    return (
      <Link
        href={href}
        className={cn(
          'relative flex items-center justify-center py-2 rounded-xl transition-colors',
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <FontAwesomeIcon icon={icon} className="h-5 w-5" />
        {(count ?? 0) > 0 && (
          <span className={cn(
            'absolute top-1 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] text-white font-bold leading-none',
            color ?? 'bg-red-500'
          )}>
            {count! > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 items-center border-t border-border bg-card/95 backdrop-blur-md px-1 py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] md:hidden">
      {navLink('/feed', faHouse)}
      {navLink('/notifications', faBell, unreadCount, 'bg-red-500')}

      {/* Center create post button */}
      <div className="flex justify-center">
        <button
          onClick={() => setCreatePostOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #E91E8C, #9333EA, #06B6D4)' }}
        >
          <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
        </button>
      </div>

      {navLink('/messages', faMessage, unreadMessages, 'bg-purple-600')}

      <Link
        href={user ? `/profile/${user.username}` : '/login'}
        className={cn(
          'relative flex items-center justify-center py-2 rounded-xl transition-colors',
          pathname.startsWith('/profile') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
      </Link>
    </nav>
  )
}
