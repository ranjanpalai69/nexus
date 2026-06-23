'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faMagnifyingGlass, faBell, faMessage, faUser, faPlus } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils/cn'
import { useNotificationStore } from '@/store/notificationStore'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { href: '/feed', icon: faHouse, label: 'Home' },
  { href: '/search', icon: faMagnifyingGlass, label: 'Search' },
  { href: '/notifications', icon: faBell, label: 'Alerts', badge: 'notifications' as const },
  { href: '/messages', icon: faMessage, label: 'Messages', badge: 'messages' as const },
]

export function MobileNav() {
  const pathname = usePathname()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const unreadMessages = useChatStore((s) =>
    s.conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)
  )
  const { setCreatePostOpen } = useUIStore()
  const user = useAuthStore((s) => s.user)

  const getBadgeCount = (badge?: 'notifications' | 'messages') => {
    if (badge === 'notifications') return unreadCount
    if (badge === 'messages') return unreadMessages
    return 0
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-card/95 backdrop-blur-md px-1 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:hidden">
      {navItems.slice(0, 2).map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[52px]',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
            <span className="text-[9px] font-medium leading-none">{item.label}</span>
          </Link>
        )
      })}

      <button
        onClick={() => setCreatePostOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg active:scale-95 transition-transform"
      >
        <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
      </button>

      {navItems.slice(2).map((item) => {
        const active = pathname.startsWith(item.href)
        const count = getBadgeCount(item.badge)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[52px]',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
            <span className="text-[9px] font-medium leading-none">{item.label}</span>
            {count > 0 && (
              <span className={cn(
                'absolute top-0.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] text-white font-bold',
                item.badge === 'notifications' ? 'bg-red-500' : 'bg-indigo-500'
              )}>
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
        )
      })}

      {user && (
        <Link
          href={`/profile/${user.username}`}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[52px]',
            pathname.startsWith('/profile') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
          <span className="text-[9px] font-medium leading-none">Profile</span>
        </Link>
      )}
    </nav>
  )
}
