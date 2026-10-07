'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
// import Image from 'next/image'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Lock, Unlock, Volume2, VolumeX, ZoomIn, ZoomOut } from 'lucide-react'
import { logger } from '@/lib/services/Logger'
import { pageFlipAudio } from '@/lib/audio/pageFlipAudio'
// import { ErrorHandler } from '@/lib/errors/errorHandler'
import { APP_CONFIG } from '@/lib/config/app-config'
import {
  NORMAL_FLIP_DURATION,
  RAPID_FLIP_DURATION,
  RAPID_FLIP_THRESHOLD_MS,
  PAGES_AHEAD,
  PAGES_BEHIND
} from '@/lib/constants/flipbook'
import { prefetchSlidingWindow, idlePrefetchAllPages } from '@/lib/utils/pagePrefetcher'
import {
  isNumber
} from '@/lib/utils/asyncPatterns'
import { TypeGuards, ValidationHelpers } from '@/lib/guards/runtimeTypeGuards'
import type { PageFlipHandle, FlipEvent } from 'react-pageflip'
import { ZoomContainer } from '@/components/reader/ZoomContainer'
import { PageJumpInput } from '@/components/reader/PageJumpInput'
import { usePassiveEventListener } from '@/lib/performance-utils'
import { useReaderEngagement } from '@/hooks/useReaderEngagement'

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
  const containerRef = useRef<HTMLDivElement>(null)

  // Passive event listeners to prevent scroll delays on mobile touch devices
  usePassiveEventListener(containerRef, 'touchstart', () => {})
  usePassiveEventListener(containerRef, 'touchmove', () => {})

  const [currentPage, setCurrentPage] = useState(0)
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set())
  const [failedPages, setFailedPages] = useState<Set<number>>(new Set())
  const [pageAnnouncement, setPageAnnouncement] = useState('')

  // Track active page engagement durations
  const { trackPageChange } = useReaderEngagement(magazineId, 0)

  // -- Reader State --
  const [isLocked, setIsLocked] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [isToolbarOpen, setIsToolbarOpen] = useState(true)
  const [isAudioMuted, setIsAudioMuted] = useState(() => pageFlipAudio.getMuted())
  const isFirstFlipRef = useRef(true)

  // Dynamic flip animation speed (450ms default, 250ms when flipping rapidly)
  const [flippingTime, setFlippingTime] = useState<number>(NORMAL_FLIP_DURATION)
  const lastFlipTimestampRef = useRef<number>(0)

  const triggerDynamicFlipSpeed = useCallback(() => {
    const now = Date.now()
    const delta = now - lastFlipTimestampRef.current
    lastFlipTimestampRef.current = now

    if (delta > 0 && delta < RAPID_FLIP_THRESHOLD_MS) {
      setFlippingTime(RAPID_FLIP_DURATION)
    } else {
      setFlippingTime(NORMAL_FLIP_DURATION)
    }
  }, [])

  // Audio preload & mute synchronization
  useEffect(() => {
    pageFlipAudio.preload().catch(() => {})
    const unsubscribe = pageFlipAudio.subscribe(setIsAudioMuted)
    return unsubscribe
  }, [])

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

  // Analytics View Tracking
  useEffect(() => {
    // Only track if we have a valid magazineId that isn't the default one
    if (magazineId && magazineId !== 'default-mag') {
      // Import dynamically to keep client bundle small initially
      import('@/app/actions/analytics-actions').then(({ trackMagazineView }) => {
        trackMagazineView(magazineId).catch((err) => {
          logger.warn('Failed to track magazine view in Flipbook', {
            component: 'FlipbookViewer',
            magazineId,
            error: err
          })
        })
      })
    }
  }, [magazineId])

  // High-performance Sliding Window Prefetch & Decode (Tier 1 & Tier 2)
  useEffect(() => {
    let isCancelled = false

    prefetchSlidingWindow(pages, currentPage, {
      ahead: PAGES_AHEAD,
      behind: PAGES_BEHIND,
    })
      .then((decodedUrls) => {
        if (isCancelled) return
        setPreloadedPages((prev) => {
          const nextSet = new Set(prev)
          pages.forEach((url, idx) => {
            if (decodedUrls.includes(url)) {
              nextSet.add(idx)
            }
          })
          return nextSet
        })
      })
      .catch(() => {})

    return () => {
      isCancelled = true
    }
  }, [currentPage, pages])

  // Passive Background Idle Prefetch of Entire Magazine (Tier 3)
  useEffect(() => {
    const cancelIdle = idlePrefetchAllPages(pages, currentPage)
    return cancelIdle
  }, [pages, currentPage])

  const onFlip = useCallback((flipEvent: FlipEvent) => {
    triggerDynamicFlipSpeed()
    const pageNumber = ValidationHelpers.validateOrDefault(flipEvent.data, isNumber, 0, 'onFlip')
    setCurrentPage(pageNumber)
    setPageAnnouncement(`Sayfa ${pageNumber + 1} / ${pages.length}`)
    trackPageChange(pageNumber)
    if (!isFirstFlipRef.current) {
      pageFlipAudio.play()
    } else {
      isFirstFlipRef.current = false
    }
  }, [pages.length, trackPageChange, triggerDynamicFlipSpeed])

  const handlePageJump = useCallback((targetPageIndex: number) => {
    if (!bookRef.current) {
      logger.warn('Cannot jump to page: bookRef is null', {
        component: 'FlipbookViewer',
        operation: 'handlePageJump',
        targetPageIndex
      })
      return
    }

    try {
      triggerDynamicFlipSpeed()
      const pageFlipInstance = bookRef.current.pageFlip()
      if (!pageFlipInstance) {
        throw new Error('pageFlip instance is not available')
      }
      pageFlipInstance.flip(targetPageIndex)
    } catch (error) {
      logger.error('Page jump failed', {
        component: 'FlipbookViewer',
        operation: 'handlePageJump',
        targetPageIndex,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }, [triggerDynamicFlipSpeed])

  const prefetchNextPageImage = useCallback(() => {
    const nextIdx = currentPage + 1
    if (nextIdx < pages.length && !preloadedPages.has(nextIdx) && !failedPages.has(nextIdx)) {
      const img = new window.Image()
      img.src = pages[nextIdx]
      img.onload = () => {
        setPreloadedPages(prev => new Set([...prev, nextIdx]))
      }
    }
  }, [currentPage, pages, preloadedPages, failedPages])

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyboardNavigation = (keyboardEvent: KeyboardEvent) => {
      if (!bookRef.current) return
      if (isLocked) return

      try {
        if (keyboardEvent.key === 'ArrowRight') {
          triggerDynamicFlipSpeed()
          bookRef.current.pageFlip().flipNext()
        } else if (keyboardEvent.key === 'ArrowLeft') {
          triggerDynamicFlipSpeed()
          bookRef.current.pageFlip().flipPrev()
        }
      } catch {
        // Handle error silently
      }
    }
    window.addEventListener('keydown', handleKeyboardNavigation)
    return () => window.removeEventListener('keydown', handleKeyboardNavigation)
  }, [pages.length, isLocked, triggerDynamicFlipSpeed])

  // -- Zoom Control --
  const zoomRef = useRef<{ zoomIn: () => void; zoomOut: () => void; reset: () => void }>(null)

  if (!pages.length) return <div className="text-white">Geçerli sayfa bulunamadı.</div>

  const handleZoomIn = () => zoomRef.current?.zoomIn()
  const handleZoomOut = () => zoomRef.current?.zoomOut()

  return (
    <div
      ref={containerRef}
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
            flippingTime={flippingTime}
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
              const shouldLoad = Math.abs(index - currentPage) <= PAGES_AHEAD || preloadedPages.has(index)

              return (
                <div
                  key={index}
                  className="page relative bg-neutral-800 shadow-2xl overflow-hidden [will-change:transform] [transform:translateZ(0)] [backface-visibility:hidden]"
                >
                  {shouldLoad ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Pageflip needs raw img sizing and lazy page-level loading.
                    <img
                      src={url}
                      alt={`Sayfa ${index + 1}`}
                      className="absolute inset-0 w-full h-full object-fill [will-change:transform]" /* Replicating fill + objectFit: 'fill' */
                      loading={Math.abs(index - currentPage) <= 1 ? "eager" : "lazy"}
                      onError={() => setFailedPages(prev => new Set([...prev, index]))}
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
            })}
          </SafeFlipBook>
        </ZoomContainer>

        {/* Navigation Overlays (Desktop Only) */}
        {!isLocked && zoomLevel === 1 && (
          <>
            <button
              type="button"
              onClick={() => {
                triggerDynamicFlipSpeed()
                bookRef.current?.pageFlip().flipPrev()
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-black/20 text-white hover:bg-black/50 backdrop-blur-md transition-all opacity-100 disabled:hidden"
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerDynamicFlipSpeed()
                bookRef.current?.pageFlip().flipNext()
              }}
              onMouseEnter={prefetchNextPageImage}
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

          <PageJumpInput
            currentPage={currentPage}
            totalPages={pages.length}
            isLocked={isLocked}
            zoomLevel={zoomLevel}
            isVisible={isToolbarOpen}
            isMobile={isMobile}
            onPageJump={handlePageJump}
          />

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
            type="button"
            onClick={() => pageFlipAudio.toggleMute()}
            className={`p-2 rounded-full transition-colors ${isToolbarOpen ? '' : 'hidden'} ${isAudioMuted ? 'text-white/40 hover:text-white/70 hover:bg-white/10' : 'text-white/80 hover:bg-white/10'}`}
            title={isAudioMuted ? 'Sesi Aç' : 'Sesi Kapat'}
            aria-label={isAudioMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {isAudioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

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

