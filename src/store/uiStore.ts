import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  createPostOpen: boolean
  mediaViewerUrl: string | null
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setCreatePostOpen: (open: boolean) => void
  openMediaViewer: (url: string) => void
  closeMediaViewer: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  createPostOpen: false,
  mediaViewerUrl: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCreatePostOpen: (createPostOpen) => set({ createPostOpen }),
  openMediaViewer: (mediaViewerUrl) => set({ mediaViewerUrl }),
  closeMediaViewer: () => set({ mediaViewerUrl: null }),
}))
