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

  const navLink = (href: string, icon: typeof faHouse, label: string, count?: number, color?: string) => {
    const active = pathname.startsWith(href)
    return (
      <Link
        href={href}
        className={cn(
          'relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors',
          active ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        <FontAwesomeIcon icon={icon} className="h-5 w-5" />
        <span className="text-[9px] font-medium leading-none">{label}</span>
        {(count ?? 0) > 0 && (
          <span className={cn(
            'absolute top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] text-white font-bold',
            color ?? 'bg-red-500'
          )}>
            {count! > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 items-center border-t border-border bg-card/95 backdrop-blur-md px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:hidden">
      {navLink('/feed', faHouse, 'Home')}
      {navLink('/notifications', faBell, 'Alerts', unreadCount, 'bg-red-500')}

      {/* Center create post button */}
      <div className="flex justify-center">
        <button
          onClick={() => setCreatePostOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg active:scale-95 transition-transform"
        >
          <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
        </button>
      </div>

      {navLink('/messages', faMessage, 'Messages', unreadMessages, 'bg-indigo-500')}

      <Link
        href={user ? `/profile/${user.username}` : '/login'}
        className={cn(
          'relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors',
          pathname.startsWith('/profile') ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
        <span className="text-[9px] font-medium leading-none">Profile</span>
      </Link>
    </nav>
  )
}
