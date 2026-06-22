'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faMagnifyingGlass, faBell, faMessage, faPlus } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils/cn'
import { useNotificationStore } from '@/store/notificationStore'
import { useUIStore } from '@/store/uiStore'

const navItems = [
  { href: '/feed', icon: faHouse, label: 'Home' },
  { href: '/search', icon: faMagnifyingGlass, label: 'Search' },
  { href: '/notifications', icon: faBell, label: 'Alerts', badge: true },
  { href: '/messages', icon: faMessage, label: 'Messages' },
]

export function MobileNav() {
  const pathname = usePathname()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const { setCreatePostOpen } = useUIStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-card/95 backdrop-blur-md px-2 py-2 md:hidden">
      {navItems.slice(0, 2).map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
            <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}

      <button
        onClick={() => setCreatePostOpen(true)}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg"
      >
        <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
      </button>

      {navItems.slice(2).map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} className={cn('relative flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
            <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
            {item.badge && unreadCount > 0 && (
              <span className="absolute -top-0.5 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
