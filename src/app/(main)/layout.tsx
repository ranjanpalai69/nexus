'use client'
import { useEffect, Suspense } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { RightPanel } from '@/components/layout/RightPanel'
import { MediaViewer } from '@/components/shared/MediaViewer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreatePost } from '@/components/feed/CreatePost'
import { useUIStore } from '@/store/uiStore'
import { usePathname, useRouter } from 'next/navigation'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Logo } from '@/components/shared/Logo'
import { IncomingCallModal } from '@/components/call/IncomingCallModal'
import { CallOverlay } from '@/components/call/CallOverlay'
import { CallNotificationHandler } from '@/components/call/CallNotificationHandler'
import { useCallStore } from '@/store/callStore'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faRightFromBracket, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'

import { usePushSubscription } from '@/hooks/usePushSubscription'

function SocketInitializer() {
  useSocket()
  usePushSubscription()
  return null
}

function MobileHeader() {
  const router = useRouter()
  const supabase = createClient()
  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
  }
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-2 bg-card/95 backdrop-blur-md border-b border-border">
      <Link href="/feed"><Logo size="sm" variant="full" /></Link>
      <div className="flex items-center gap-0.5">
        <Link href="/search">
          <Button variant="ghost" size="icon-sm" title="Search">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
          </Button>
        </Link>
        <ThemeToggle />
        <Link href="/settings">
          <Button variant="ghost" size="icon-sm" title="Settings">
            <FontAwesomeIcon icon={faGear} className="h-4 w-4" />
          </Button>
        </Link>
        <Button variant="ghost" size="icon-sm" onClick={handleLogout} title="Logout">
          <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

function NotificationInitializer() {
  const userId = useAuthStore((s) => s.user?.id)
  const setNotifications = useNotificationStore((s) => s.setNotifications)
  useEffect(() => {
    if (!userId) return
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => { if (d.notifications) setNotifications(d.notifications) })
      .catch(() => {})
  }, [userId, setNotifications])
  return null
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const createPostOpen = useUIStore((s) => s.createPostOpen)
  const setCreatePostOpen = useUIStore((s) => s.setCreatePostOpen)
  const pathname = usePathname()
  const incomingCall = useCallStore((s) => s.incomingCall)
  const activeCall = useCallStore((s) => s.activeCall)

  // On individual conversation pages, the chat takes the full viewport on mobile
  // (no app header, no bottom nav) — just like WhatsApp/Instagram DMs.
  const isConversationPage = /^\/messages\/.+/.test(pathname)
  const showRightPanel = !pathname.startsWith('/messages')

  return (
    <div className="min-h-screen bg-background">
      <SocketInitializer />
      <NotificationInitializer />

      {/* Mobile top header — hidden on conversation pages (chat has its own header) */}
      {!isConversationPage && <MobileHeader />}

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className={`md:ml-16 lg:ml-64 transition-all duration-300 ${isConversationPage ? 'h-dvh overflow-hidden md:h-auto md:overflow-visible' : ''}`}>
        <div className={
          isConversationPage
            ? 'h-full md:mx-auto md:max-w-5xl md:px-3 md:py-6'
            : `mx-auto max-w-5xl px-3 sm:px-4 pt-16 pb-4 md:py-6 md:pt-6 sm:pt-16 ${showRightPanel ? 'grid grid-cols-1 xl:grid-cols-[1fr_288px] gap-4 lg:gap-6' : ''}`
        }>
          <main className={isConversationPage ? 'h-full' : 'min-w-0'}>{children}</main>
          {showRightPanel && (
            <div className="hidden xl:block">
              <RightPanel />
            </div>
          )}
        </div>
      </div>

      {/* Footer — visible on tablet/mobile, hidden on xl (RightPanel has it) and on conversation pages */}
      {showRightPanel && (
        <div className="xl:hidden md:ml-16 lg:ml-64 px-4 pb-4 text-center space-y-0.5">
          <p className="text-xs text-muted-foreground">
            © 2025 Nexus · <Link href="/privacy" className="hover:underline">Privacy</Link> · <Link href="/terms" className="hover:underline">Terms</Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Made &amp; managed by{' '}
            <a href="https://ranjanpalai69.github.io/" target="_blank" rel="noopener noreferrer"
              className="hover:underline text-foreground font-medium">
              Ranjan Palai
            </a>
          </p>
        </div>
      )}

      {/* Mobile nav — hidden on conversation pages (full-screen chat) */}
      {!isConversationPage && (
        <div className="md:hidden">
          <MobileNav />
          <div className="h-20" />
        </div>
      )}

      {/* Create Post Modal */}
      <Dialog open={createPostOpen} onOpenChange={setCreatePostOpen}>
        <DialogContent className="w-full max-w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>
          <CreatePost onSuccess={() => setCreatePostOpen(false)} />
        </DialogContent>
      </Dialog>

      <MediaViewer />

      {/* Global call UI */}
      <Suspense fallback={null}>
        <CallNotificationHandler />
      </Suspense>
      {incomingCall && <IncomingCallModal />}
      {activeCall && <CallOverlay />}
    </div>
  )
}
