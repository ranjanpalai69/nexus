'use client'
import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faDownload } from '@fortawesome/free-solid-svg-icons'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

export function MediaViewer() {
  const { mediaViewerUrl, closeMediaViewer } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMediaViewer() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closeMediaViewer])

  const isVideo = mediaViewerUrl?.match(/\.(mp4|webm|mov)(\?|$)/i)

  return (
    <AnimatePresence>
      {mediaViewerUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          onClick={closeMediaViewer}
        >
          <div className="absolute right-4 top-4 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={(e) => { e.stopPropagation(); window.open(mediaViewerUrl, '_blank') }}
            >
              <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={closeMediaViewer}>
              <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
            </Button>
          </div>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideo ? (
              <video src={mediaViewerUrl} controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded-xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaViewerUrl} alt="Media" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
