'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
// import Image from 'next/image'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Lock, Unlock, ZoomIn, ZoomOut } from 'lucide-react'
import { logger } from '@/lib/services/Logger'
// import { ErrorHandler } from '@/lib/errors/errorHandler'
import { APP_CONFIG } from '@/lib/config/app-config'
import {
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
  const bookRef = useRef<PageFlipHandle | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set())
  const [failedPages, setFailedPages] = useState<Set<number>>(new Set())
  const [pageAnnouncement, setPageAnnouncement] = useState('')

  // -- Reader State --
  const [isLocked, setIsLocked] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [isToolbarOpen, setIsToolbarOpen] = useState(true)

  // -- Analytics --
  useMagazineAnalytics(magazineId)

  // Responsive spread detection & Scroll lock
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    document.body.classList.add('reader-lock-scroll')

    return () => {
      window.removeEventListener('resize', checkMobile)
      document.body.classList.remove('reader-lock-scroll')
    }
  }, [])

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
      if (isLocked) return

      try {
        if (keyboardEvent.key === 'ArrowRight') {
          bookRef.current.pageFlip().flipNext()
        } else if (keyboardEvent.key === 'ArrowLeft') {
          bookRef.current.pageFlip().flipPrev()
        }
      } catch {
        // Handle error silently
      }
    }
    window.addEventListener('keydown', handleKeyboardNavigation)
    return () => window.removeEventListener('keydown', handleKeyboardNavigation)
  }, [pages.length, isLocked])

  // -- Zoom Control --
  const zoomRef = useRef<{ zoomIn: () => void; zoomOut: () => void; reset: () => void }>(null)

  if (!pages.length) return <div className="text-white">Geçerli sayfa bulunamadı.</div>

  const handleZoomIn = () => zoomRef.current?.zoomIn()
  const handleZoomOut = () => zoomRef.current?.zoomOut()

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative select-none touch-none"
      role="region"
      aria-label="Dergi görüntüleyici"
    >
      {/* Live region */}
      <div role="status" aria-live="polite" className="sr-only">{pageAnnouncement}</div>

      {/* Main Viewer Area - CSS Driven Stability */}
      <div className="w-full h-full overflow-hidden relative group">
        <ZoomContainer
          ref={zoomRef}
          minScale={1}
          maxScale={4}
          locked={isLocked}
          onZoomChange={setZoomLevel}
        >
          <SafeFlipBook
            ref={bookRef}
            width={848}
            height={1200}
            size="stretch"
            minWidth={300}
            maxWidth={2500}
            minHeight={400}
            maxHeight={3000}
            showCover
            maxShadowOpacity={0.5}
            drawShadow
            usePortrait={isMobile}
            startPage={0}
            flippingTime={1000}
            useMouseEvents={!isLocked && zoomLevel === 1}
            swipeDistance={30}
            showPageCorners={false}
            disableFlipByClick={isLocked || zoomLevel > 1}
            mobileScrollSupport={!isLocked && zoomLevel === 1}
            onFlip={onFlip}
            className="mx-auto"
            style={{ margin: '0 auto' }}
          >
            {pages.map((url, index) => {
              const { pagesAhead } = APP_CONFIG.magazine.preload
              const shouldLoad = Math.abs(index - currentPage) <= pagesAhead + 1 || preloadedPages.has(index)

              return (
                <div key={index} className="page relative bg-neutral-800 shadow-2xl overflow-hidden">
                  {shouldLoad ? (
                    <img
                      src={url}
                      alt={`Sayfa ${index + 1}`}
                      className="absolute inset-0 w-full h-full object-fill" /* Replicating fill + objectFit: 'fill' */
                      loading={Math.abs(index - currentPage) <= 1 ? "eager" : "lazy"}
                      onError={() => setFailedPages(prev => new Set([...prev, index]))}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  {/* Subtle spine line for double spread realism */}
                  {!isMobile && index % 2 !== 0 && (
                    <div className="absolute top-0 right-0 w-px h-full bg-black/10 z-10" />
                  )}
                </div>
              )
            })}
          </SafeFlipBook>
        </ZoomContainer>

        {/* Navigation Overlays (Desktop Only) */}
        {!isLocked && zoomLevel === 1 && (
          <>
            <button
              type="button"
              onClick={() => bookRef.current?.pageFlip().flipPrev()}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-black/20 text-white hover:bg-black/50 backdrop-blur-md transition-all opacity-100 disabled:hidden"
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              type="button"
              onClick={() => bookRef.current?.pageFlip().flipNext()}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-black/20 text-white hover:bg-black/50 backdrop-blur-md transition-all opacity-100 disabled:hidden"
              disabled={currentPage === pages.length - 1}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}
      </div>

      {/* Immersive Toolbar (Fixed at Bottom) */}
      <div
        className={`fixed bottom-6 z-50 px-4 w-full flex ${isToolbarOpen ? 'left-1/2 -translate-x-1/2 justify-center' : 'right-0 justify-end'}`}
      >
        <div
          className={`flex items-center gap-2 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl transition-all hover:bg-black/80 ${isToolbarOpen ? 'px-6 py-3' : 'px-4 py-3'}`}
        >
          <button
            type="button"
            onClick={() => setIsToolbarOpen(v => !v)}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors"
            title={isToolbarOpen ? 'Paneli gizle' : 'Paneli göster'}
            aria-expanded={isToolbarOpen}
          >
            {isToolbarOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>

          <div className={`flex items-center gap-2 text-white/90 font-bold text-sm ${isToolbarOpen ? '' : 'hidden'}`}>
            <span>{currentPage + 1}</span>
            <span className="opacity-40 whitespace-nowrap">/ {pages.length}</span>
          </div>

          <div className={`h-6 w-px bg-white/10 ${isToolbarOpen ? '' : 'hidden'}`} />

          <span className={`text-xs font-black text-white/80 tracking-tight ${isToolbarOpen ? 'hidden' : ''}`}>
            Kontroller
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className={`p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors disabled:opacity-20 ${isToolbarOpen ? '' : 'hidden'}`}
              disabled={zoomLevel <= 1}
              title="Küçült"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-xs font-black text-white w-10 text-center tracking-tighter">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className={`p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors disabled:opacity-20 ${isToolbarOpen ? '' : 'hidden'}`}
              disabled={zoomLevel >= 4}
              title="Büyüt"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          <div className={`h-6 w-px bg-white/10 ${isToolbarOpen ? '' : 'hidden'}`} />

          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`p-2 rounded-full transition-all ${isLocked ? 'bg-red-600 text-white shadow-lg shadow-red-600/40' : 'hover:bg-white/10 text-white/80'} ${isToolbarOpen ? '' : 'hidden'}`}
            title={isLocked ? "Kilidi Aç" : "Kilitle"}
          >
            {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  )
})

