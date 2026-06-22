'use client'
import { useSocket } from '@/hooks/useSocket'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { RightPanel } from '@/components/layout/RightPanel'
import { MediaViewer } from '@/components/shared/MediaViewer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreatePost } from '@/components/feed/CreatePost'
import { useUIStore } from '@/store/uiStore'
import { usePathname } from 'next/navigation'

function SocketInitializer() {
  useSocket()
  return null
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { createPostOpen, setCreatePostOpen } = useUIStore()
  const pathname = usePathname()
  const isMessages = pathname.startsWith('/messages/')
  const showRightPanel = !pathname.startsWith('/messages')

  return (
    <div className="min-h-screen bg-background">
      <SocketInitializer />

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
