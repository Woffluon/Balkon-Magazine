'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Lock, Unlock, ZoomIn, ZoomOut } from 'lucide-react'
import { useResponsiveDimensions } from '@/hooks/useResponsiveDimensions'
import { logger } from '@/lib/services/Logger'
import { ErrorHandler } from '@/lib/errors/errorHandler'
import { APP_CONFIG } from '@/lib/config/app-config'
import {
  executeAsyncOperation,
  createStandardizedPromise,
  isNumber
} from '@/lib/utils/asyncPatterns'
import { TypeGuards, ValidationHelpers } from '@/lib/guards/runtimeTypeGuards'
import type { PageFlipHandle, FlipEvent } from 'react-pageflip'
import { ZoomContainer } from '@/components/reader/ZoomContainer'
import { useMagazineAnalytics } from '@/hooks/useMagazineAnalytics'

const SafeFlipBook = dynamic(() => import('react-pageflip'), {
  ssr: false,
  loading: () => <div className={`h-[${APP_CONFIG.magazine.viewport.loadingHeight}px] flex items-center justify-center text-sm text-muted-foreground`}>Yükleniyor...</div>,
})

interface FlipbookViewerProps {
  imageUrls: string[]
  magazineId?: string // Optional for backward compatibility, but needed for analytics
}

/**
 * Validates image URLs array using type guards
 */
function validateImageUrls(urls: unknown): string[] {
  if (!TypeGuards.isArray(urls)) {
    logger.warn('Invalid imageUrls provided to FlipbookViewer', {
      component: 'FlipbookViewer',
      operation: 'validateImageUrls',
      receivedType: typeof urls
    })
    return []
  }

  return urls
    .filter((url): url is string => {
      if (!TypeGuards.isString(url) || url.trim().length === 0) {
        return false
      }
      return true
    })
    .map(url => url.trim())
}

export default React.memo(function FlipbookViewer({ imageUrls, magazineId = 'default-mag' }: FlipbookViewerProps) {
  const pages = useMemo(() => validateImageUrls(imageUrls), [imageUrls])
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<PageFlipHandle | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set())
  const [failedPages, setFailedPages] = useState<Set<number>>(new Set())
  const [pageAnnouncement, setPageAnnouncement] = useState('')

  // -- Reader State --
  const [isLocked, setIsLocked] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  // -- Analytics --
  useMagazineAnalytics(magazineId)

  // Use custom hook for responsive dimensions
  const dimensions = useResponsiveDimensions(containerRef, {
    w: APP_CONFIG.magazine.aspectRatio.width,
    h: APP_CONFIG.magazine.aspectRatio.height
  })

  // Image preload
  useEffect(() => {
    const abortController = new AbortController()
    const { signal } = abortController

    const { pagesAhead } = APP_CONFIG.magazine.preload
    const nextIndices = Array.from({ length: pagesAhead }, (_, i) => currentPage + i + 1)

    const preloadImages = async () => {
      const preloadPromises = nextIndices
        .filter(idx => idx < pages.length && !preloadedPages.has(idx) && !failedPages.has(idx))
        .map(idx =>
          createStandardizedPromise<void>(
            (resolve, reject) => {
              if (signal.aborted) {
                reject(new Error('Preload cancelled'))
                return
              }
              const img = new window.Image()
              const cleanup = () => { img.onload = null; img.onerror = null }

              img.onload = () => {
                if (!signal.aborted) setPreloadedPages(prev => new Set([...prev, idx]))
                resolve()
              }
              img.onerror = () => {
                if (!signal.aborted) setFailedPages(prev => new Set([...prev, idx]))
                resolve()
              }
              img.src = pages[idx]
              return cleanup
            },
            { timeout: 10000, context: { component: 'FlipbookViewer', operation: 'preloadImage' } }
          )
        )

      if (preloadPromises.length > 0) {
        await Promise.allSettled(preloadPromises)
      }
    }

    preloadImages().catch(() => { })
    return () => abortController.abort()
  }, [currentPage, pages, preloadedPages, failedPages])

  const onFlip = useCallback((flipEvent: FlipEvent) => {
    const pageNumber = ValidationHelpers.validateOrDefault(flipEvent.data, isNumber, 0, 'onFlip')
    setCurrentPage(pageNumber)
    setPageAnnouncement(`Sayfa ${pageNumber + 1} / ${pages.length}`)
  }, [pages.length])

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyboardNavigation = (keyboardEvent: KeyboardEvent) => {
      if (!bookRef.current) return
      if (isLocked) return // Disable keyboard nav if locked

      try {
        if (keyboardEvent.key === 'ArrowRight') {
          bookRef.current.pageFlip().flipNext()
        } else if (keyboardEvent.key === 'ArrowLeft') {
          bookRef.current.pageFlip().flipPrev()
        }
      } catch (error) {
        // Handle error silently
      }
    }
    window.addEventListener('keydown', handleKeyboardNavigation)
    return () => window.removeEventListener('keydown', handleKeyboardNavigation)
  }, [pages.length, isLocked])

  if (!pages.length) return <div>No Pages</div>

  // -- Zoom Control --
  const zoomRef = useRef<{ zoomIn: () => void; zoomOut: () => void; reset: () => void }>(null)

  const handleZoomIn = () => zoomRef.current?.zoomIn()
  const handleZoomOut = () => zoomRef.current?.zoomOut()

  return (
    <div
      className="relative w-full flex flex-col items-center"
      role="region"
      aria-label="Dergi görüntüleyici"
    >
      {/* Live region */}
      <div role="status" aria-live="polite" className="sr-only">{pageAnnouncement}</div>

      {/* Toolbar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-neutral-200 z-30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-600">
            {currentPage + 1} / {pages.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`p-2 rounded-md transition-colors ${isLocked ? 'bg-amber-100 text-amber-700' : 'hover:bg-neutral-100 text-neutral-600'}`}
            title={isLocked ? "Sayfa Kilidini Aç" : "Sayfayı Kilitle"}
          >
            {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </button>
          <div className="h-4 w-px bg-neutral-200 mx-1" />
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 disabled:opacity-50"
            title="Küçült"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium w-12 text-center text-neutral-700">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 disabled:opacity-50"
            title="Büyüt"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewer Area */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden bg-neutral-50 rounded-xl shadow-inner border border-neutral-100"
        style={{ height: dimensions.h }}
      >
        <ZoomContainer
          ref={zoomRef}
          minScale={1}
          maxScale={4}
          locked={isLocked}
          onZoomChange={setZoomLevel}
        >
          <SafeFlipBook
            ref={bookRef}
            width={dimensions.w}
            height={dimensions.h}
            showCover
            size="fixed"
            maxShadowOpacity={0}
            drawShadow={false}
            usePortrait
            mobileScrollSupport={!isLocked} // Native support disable attempt
            onFlip={onFlip}
          // When locked, we try to restrict events via parent, but passing props helps if supported
          >
            {pages.map((url, index) => {
              // Preload logic can stay simplified here for brevity
              const { pagesAhead } = APP_CONFIG.magazine.preload
              const shouldLoad = Math.abs(index - currentPage) <= pagesAhead + 1 || preloadedPages.has(index)

              return (
                <div key={index} className="page overflow-hidden" style={{ width: dimensions.w, height: dimensions.h }}>
                  {shouldLoad ? (
                    <Image
                      src={url}
                      alt={`Page ${index + 1}`}
                      fill
                      priority={Math.abs(index - currentPage) <= 1}
                      style={{ objectFit: 'contain' }}
                      onError={() => setFailedPages(prev => new Set([...prev, index]))}
                    />
                  ) : <div className="w-full h-full bg-neutral-100" />}
                </div>
              )
            })}
          </SafeFlipBook>
        </ZoomContainer>

        {/* Navigation Arrows (Outside Zoom Container to stay fixed in view) */}
        {!isLocked && (
          <>
            <button
              type="button"
              onClick={() => bookRef.current?.pageFlip().flipPrev()}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-all active:scale-95 disabled:opacity-0"
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => bookRef.current?.pageFlip().flipNext()}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-all active:scale-95 disabled:opacity-0"
              disabled={currentPage === pages.length - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Mobile Tap Zones Disclaimer */}
      <p className="mt-4 text-xs text-neutral-400">
        {isLocked ? 'Sayfa kilitli. Kilidi açarak çevirebilirsiniz.' : 'Büyütmek için tekerleği kullanın veya parmaklarınızla sıkıştırın.'}
      </p>
    </div>
  )
})

