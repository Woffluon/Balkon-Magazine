'use client'

import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { ImageOff } from 'lucide-react'
import { PAGES_AHEAD } from '@/lib/constants/flipbook'

/**
 * Lightweight external store tracking the active flipbook page index.
 * Allows individual pages to subscribe to their own window visibility boolean
 * so page flips do not re-render unaffected pages or rebuild parent JSX.
 */
export function createPageWindowStore(initialPage = 0): {
  getPage: () => number
  setPage: (page: number) => void
  subscribe: (listener: () => void) => () => void
} {
  let currentPage = initialPage
  const listeners = new Set<() => void>()

  return {
    getPage: () => currentPage,
    setPage: (page: number) => {
      if (Object.is(page, currentPage)) {
        return
      }
      currentPage = page
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export type PageWindowStore = ReturnType<typeof createPageWindowStore>

export interface FlipbookPageProps {
  url: string
  index: number
  isMobile: boolean
  windowStore: PageWindowStore
  pagesAhead?: number
  onImageError?: (index: number) => void
}

const FlipbookPageBase = React.forwardRef<HTMLDivElement, FlipbookPageProps>(
  function FlipbookPage(
    { url, index, isMobile, windowStore, pagesAhead = PAGES_AHEAD, onImageError },
    ref
  ) {
    const getSnapshot = useCallback(
      () => Math.abs(index - windowStore.getPage()) <= pagesAhead,
      [index, pagesAhead, windowStore]
    )

    const isInWindow = useSyncExternalStore(
      windowStore.subscribe,
      getSnapshot,
      getSnapshot
    )

    const [hasLoaded, setHasLoaded] = useState(() => isInWindow)
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
      if (isInWindow && !hasLoaded) {
        setHasLoaded(true)
      }
    }, [isInWindow, hasLoaded])

    useEffect(() => {
      setHasError(false)
    }, [url])

    const handleImageError = useCallback(() => {
      setHasError(true)
      onImageError?.(index)
    }, [index, onImageError])

    const shouldRenderImage = isInWindow || hasLoaded

    return (
      <div
        ref={ref}
        className="page relative bg-neutral-800 overflow-hidden"
      >
        {hasError ? (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#1a1d23] text-neutral-400 p-4 text-center"
            role="img"
            aria-label={`Sayfa ${index + 1} yüklenemedi`}
          >
            <ImageOff className="w-8 h-8 text-neutral-500" aria-hidden="true" />
            <span className="text-xs font-medium">Sayfa {index + 1} yüklenemedi</span>
          </div>
        ) : shouldRenderImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- Pageflip needs raw img sizing and page-level windowing.
          <img
            src={url}
            alt={`Sayfa ${index + 1}`}
            className="absolute inset-0 w-full h-full object-fill"
            loading="eager"
            decoding="async"
            draggable={false}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1d23] animate-reader-shimmer">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        {/* Subtle spine line for double spread realism */}
        {!isMobile && index % 2 !== 0 && (
          <div className="absolute top-0 right-0 w-px h-full bg-black/15 z-10 pointer-events-none" />
        )}
      </div>
    )
  }
)

FlipbookPageBase.displayName = 'FlipbookPage'

export const FlipbookPage = React.memo(FlipbookPageBase)
