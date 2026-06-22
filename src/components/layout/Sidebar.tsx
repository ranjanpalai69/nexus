'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse, faMagnifyingGlass, faBell, faMessage, faUser,
  faGear, faRightFromBracket, faPlus, faFire
} from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useUIStore } from '@/store/uiStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const navItems = [
  { href: '/feed', icon: faHouse, label: 'Home' },
  { href: '/search', icon: faMagnifyingGlass, label: 'Search' },
  { href: '/notifications', icon: faBell, label: 'Notifications', badge: true },
  { href: '/messages', icon: faMessage, label: 'Messages' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
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
      className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card px-4 py-6"
    >
      {/* Logo */}
      <Link href="/feed" className="flex items-center gap-3 px-2 mb-8">
        <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-sm">N</span>
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
          Nexus
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors relative',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <FontAwesomeIcon icon={item.icon} className="h-4 w-4 shrink-0" />
              {item.label}
              {item.badge && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}

        <Link
          href={`/profile/${user.username}`}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
            pathname.startsWith('/profile')
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <FontAwesomeIcon icon={faUser} className="h-4 w-4 shrink-0" />
          Profile
        </Link>

        <Link
          href="/explore"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
            pathname === '/explore'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <FontAwesomeIcon icon={faFire} className="h-4 w-4 shrink-0" />
          Explore
        </Link>
      </nav>

      {/* Create Post Button */}
      <Button
        variant="gradient"
        className="w-full gap-2 mb-4"
        onClick={() => setCreatePostOpen(true)}
      >
        <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
        New Post
      </Button>

      {/* User Menu */}
      <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent transition-colors">
        <UserAvatar user={user} size="sm" showOnline />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{user.full_name || user.username}</p>
          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
        </div>
        <div className="flex gap-1">
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
