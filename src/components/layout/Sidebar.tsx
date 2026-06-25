'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Logo } from '@/components/shared/Logo'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse, faMagnifyingGlass, faBell, faMessage, faUser,
  faGear, faRightFromBracket, faPlus, faFire
} from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const navItems = [
  { href: '/feed', icon: faHouse, label: 'Home' },
  { href: '/search', icon: faMagnifyingGlass, label: 'Search' },
  { href: '/notifications', icon: faBell, label: 'Notifications', badge: 'notifications' },
  { href: '/messages', icon: faMessage, label: 'Messages', badge: 'messages' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const unreadMessages = useChatStore((s) =>
    s.conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)
  )
  const { setCreatePostOpen } = useUIStore()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Signed out')
  }

  if (!user) return null

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card
        w-16 md:w-16 lg:w-64 px-2 lg:px-4 py-6 transition-all duration-300"
    >
      {/* Logo */}
      <Link href="/feed" className="flex items-center px-1 lg:px-2 mb-8 justify-center lg:justify-start">
        <Logo size="sm" variant="icon" className="lg:hidden" />
        <Logo size="sm" variant="full" className="hidden lg:flex" />
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'flex items-center gap-3 rounded-xl px-2.5 lg:px-3 py-2.5 text-sm font-medium transition-colors relative',
                'justify-center lg:justify-start',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <FontAwesomeIcon icon={item.icon} className="h-4 w-4 shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
              {item.badge === 'notifications' && unreadCount > 0 && (
                <span className="lg:ml-auto absolute -top-0.5 -right-0.5 lg:static lg:flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white font-bold flex">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {item.badge === 'messages' && unreadMessages > 0 && (
                <span className="lg:ml-auto absolute -top-0.5 -right-0.5 lg:static lg:flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-1 text-xs text-white font-bold flex">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </Link>
          )
        })}

        <Link
          href={`/profile/${user.username}`}
          title="Profile"
          className={cn(
            'flex items-center gap-3 rounded-xl px-2.5 lg:px-3 py-2.5 text-sm font-medium transition-colors',
            'justify-center lg:justify-start',
            pathname.startsWith('/profile')
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <FontAwesomeIcon icon={faUser} className="h-4 w-4 shrink-0" />
          <span className="hidden lg:block">Profile</span>
        </Link>

        <Link
          href="/explore"
          title="Explore"
          className={cn(
            'flex items-center gap-3 rounded-xl px-2.5 lg:px-3 py-2.5 text-sm font-medium transition-colors',
            'justify-center lg:justify-start',
            pathname === '/explore'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <FontAwesomeIcon icon={faFire} className="h-4 w-4 shrink-0" />
          <span className="hidden lg:block">Explore</span>
        </Link>
      </nav>

      {/* Create Post Button */}
      <Button
        variant="gradient"
        className="w-full mb-4 gap-2 px-0 lg:px-4"
        onClick={() => setCreatePostOpen(true)}
        title="New Post"
      >
        <FontAwesomeIcon icon={faPlus} className="h-4 w-4 shrink-0" />
        <span className="hidden lg:block">New Post</span>
      </Button>

      {/* User Menu */}
      <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent transition-colors justify-center lg:justify-start">
        <UserAvatar user={user} size="sm" showOnline className="shrink-0" />
        <div className="hidden lg:block flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{user.full_name || user.username}</p>
          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
        </div>
        <div className="hidden lg:flex gap-1">
          <Link href="/settings">
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
              <FontAwesomeIcon icon={faGear} className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={handleLogout}>
            <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.aside>
  )
}
