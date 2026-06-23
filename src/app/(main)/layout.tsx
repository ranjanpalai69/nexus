'use client'
import { useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { RightPanel } from '@/components/layout/RightPanel'
import { MediaViewer } from '@/components/shared/MediaViewer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreatePost } from '@/components/feed/CreatePost'
import { useUIStore } from '@/store/uiStore'
import { usePathname } from 'next/navigation'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'

function SocketInitializer() {
  useSocket()
  return null
}

// Pre-load unread notification count on any page so the badge is always correct
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
  const { createPostOpen, setCreatePostOpen } = useUIStore()
  const pathname = usePathname()
  const showRightPanel = !pathname.startsWith('/messages')

  return (
    <div className="min-h-screen bg-background">
      <SocketInitializer />
      <NotificationInitializer />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="md:ml-16 lg:ml-64 transition-all duration-300">
        <div className={`mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-6 ${showRightPanel ? 'grid grid-cols-1 xl:grid-cols-[1fr_288px] gap-4 lg:gap-6' : ''}`}>
          <main className="min-w-0">{children}</main>
          {showRightPanel && (
            <div className="hidden xl:block">
              <RightPanel />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <MobileNav />
        <div className="h-20" /> {/* spacer */}
      </div>

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
    </div>
  )
}
