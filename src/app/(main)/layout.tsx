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
      <div className="md:ml-64">
        <div className={`mx-auto max-w-5xl px-4 py-6 ${showRightPanel ? 'grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-6' : ''}`}>
          <main className="min-w-0">{children}</main>
          {showRightPanel && (
            <div className="hidden lg:block">
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
        <DialogContent className="max-w-2xl">
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
