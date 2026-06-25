'use client'
import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface CarouselItem {
  id?: string
  url: string
  type: 'image' | 'video'
}

interface MediaCarouselProps {
  items: CarouselItem[]
  onImageClick?: (url: string) => void
  onRemove?: (index: number) => void
  aspectRatio?: 'video' | 'square'
  className?: string
}

export function MediaCarousel({
  items,
  onImageClick,
  onRemove,
  aspectRatio = 'video',
  className,
}: MediaCarouselProps) {
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const safeIndex = Math.min(index, items.length - 1)
  const current = items[safeIndex]

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex((i) => (i - 1 + items.length) % items.length)
  }, [items.length])

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex((i) => (i + 1) % items.length)
  }, [items.length])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(dx) > 40) {
      setIndex((i) => dx > 0
        ? (i + 1) % items.length
        : (i - 1 + items.length) % items.length
      )
    }
    touchStartX.current = null
  }

  if (!current) return null

  // Single item — no carousel chrome needed
  if (items.length === 1) {
    return (
      <div className={cn('relative rounded-xl overflow-hidden bg-muted group', aspectRatio === 'video' ? 'aspect-video' : 'aspect-square', className)}>
        {current.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt=""
            className={cn('w-full h-full object-cover transition-transform duration-300', onImageClick && 'cursor-pointer hover:scale-105')}
            onClick={() => onImageClick?.(current.url)}
          />
        ) : (
          <video src={current.url} controls className="w-full h-full object-cover" />
        )}
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(0); setIndex(0) }}
            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn('relative rounded-xl overflow-hidden bg-muted select-none', aspectRatio === 'video' ? 'aspect-video' : 'aspect-square', className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Current media */}
      <div className="w-full h-full">
        {current.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt=""
            className={cn('w-full h-full object-cover transition-opacity duration-200', onImageClick && 'cursor-pointer')}
            onClick={() => onImageClick?.(current.url)}
          />
        ) : (
          <video src={current.url} controls className="w-full h-full object-cover" onClick={(e) => e.stopPropagation()} />
        )}
      </div>

      {/* Remove button (upload preview mode) */}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(safeIndex); setIndex((i) => Math.max(0, i - (safeIndex <= i && i > 0 ? 1 : 0))) }}
          className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Counter badge (top-left when no remove button, top-right otherwise) */}
      {!onRemove && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium tabular-nums pointer-events-none">
          {safeIndex + 1} / {items.length}
        </div>
      )}

      {/* Left arrow */}
      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white transition-all active:scale-90 shadow"
        aria-label="Previous"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Right arrow */}
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white transition-all active:scale-90 shadow"
        aria-label="Next"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-none">
        {items.map((_, i) => (
          <span
            key={i}
            className={cn(
              'rounded-full transition-all duration-200',
              i === safeIndex
                ? 'w-4 h-1.5 bg-white'
                : 'w-1.5 h-1.5 bg-white/50'
            )}
          />
        ))}
      </div>

      {/* Thumbnail strip (visible on hover for upload preview) */}
      {onRemove && items.length > 1 && (
        <div className="absolute bottom-0 inset-x-0 flex gap-1 p-1.5 bg-gradient-to-t from-black/60 to-transparent overflow-x-auto scrollbar-none">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIndex(i) }}
              className={cn(
                'shrink-0 h-10 w-10 rounded-md overflow-hidden border-2 transition-all',
                i === safeIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              {item.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <video src={item.url} className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
