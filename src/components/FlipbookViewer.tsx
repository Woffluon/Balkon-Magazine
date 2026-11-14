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
  FLIPBOOK_PRELOAD,
  FLIPBOOK_SETTINGS,
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
import type { PageFlipAPI, PageFlipHandle, FlipEvent } from 'react-pageflip'
import { FlipbookPage, createPageWindowStore } from '@/components/reader/FlipbookPage'
import { ZoomContainer, type ZoomContainerRef } from '@/components/reader/ZoomContainer'
import { PageJumpInput } from '@/components/reader/PageJumpInput'
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

function handlePageImageError(pageIndex: number): void {
  logger.warn('Failed to load magazine page image', {
    component: 'FlipbookViewer',
    operation: 'handlePageImageError',
    pageIndex,
  })
}

export default React.memo(function FlipbookViewer({ imageUrls, magazineId = 'default-mag' }: FlipbookViewerProps) {
  const pages = useMemo(() => validateImageUrls(imageUrls), [imageUrls])
  const bookRef = useRef<PageFlipHandle | null>(null)
  const activePageFlipRef = useRef<PageFlipAPI | null>(null)
  const scheduleUpdateRef = useRef<(() => void) | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerBoxRef = useRef<HTMLDivElement>(null)

  const windowStore = useMemo(() => createPageWindowStore(0), [])
  const currentPageRef = useRef(0)
  const lastTrackedPageRef = useRef(0)

  const [currentPage, setCurrentPage] = useState(0)
  const [pageAnnouncement, setPageAnnouncement] = useState('')
  const [boxWidth, setBoxWidth] = useState(0)
  const boxWidthRef = useRef(0)

  // Track active page engagement durations
  const { trackPageChange } = useReaderEngagement(magazineId, 0)

  // -- Reader State --
  const [isLocked, setIsLocked] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  )
  const isMobileRef = useRef(isMobile)
  isMobileRef.current = isMobile
  const [isToolbarOpen, setIsToolbarOpen] = useState(true)
  const [isAudioMuted, setIsAudioMuted] = useState(() => pageFlipAudio.getMuted())
  const isFirstFlipRef = useRef(true)

  // -- Zoom Control --
  const zoomRef = useRef<ZoomContainerRef>(null)

  // Dynamic flip animation speed (450ms default, 250ms when flipping rapidly)
  const [flippingTime, setFlippingTime] = useState<number>(NORMAL_FLIP_DURATION)
  const lastFlipTimestampRef = useRef<number>(0)

  const triggerDynamicFlipSpeed = useCallback(() => {
    const now = Date.now()
    const delta = now - lastFlipTimestampRef.current
    lastFlipTimestampRef.current = now

    const nextFlippingTime =
      delta > 0 && delta < RAPID_FLIP_THRESHOLD_MS
        ? RAPID_FLIP_DURATION
        : NORMAL_FLIP_DURATION

    setFlippingTime(nextFlippingTime)

    try {
      const settings = bookRef.current?.pageFlip()?.getSettings?.()
      if (settings) {
        settings.flippingTime = nextFlippingTime
      }
    } catch {
      // Ignore if pageFlip instance is not ready yet
    }
  }, [])

  // Audio preload & mute synchronization
  useEffect(() => {
    pageFlipAudio.preload().catch(() => {})
    const unsubscribe = pageFlipAudio.subscribe(setIsAudioMuted)
    return unsubscribe
  }, [])

  // Responsive breakpoint detection & Scroll lock
  useEffect(() => {
    document.body.classList.add('reader-lock-scroll')

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const applyBreakpoint = (matchesDesktop: boolean) => {
      const nextIsMobile = !matchesDesktop
      if (isMobileRef.current !== nextIsMobile) {
        isMobileRef.current = nextIsMobile
        zoomRef.current?.reset()
        setZoomLevel(1)
        isFirstFlipRef.current = true
        setIsMobile(nextIsMobile)
      }
    }

    applyBreakpoint(mediaQuery.matches)

    const handleMediaChange = (event: MediaQueryListEvent) => {
      applyBreakpoint(event.matches)
    }

    mediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange)
      document.body.classList.remove('reader-lock-scroll')
    }
  }, [])

  // Clean up previous PageFlip UI handlers when switching portrait/landscape or unmounting
  useEffect(() => {
    return () => {
      try {
        activePageFlipRef.current?.getUI?.()?.removeHandlers?.()
      } catch {
        // Ignore cleanup errors if instance already torn down
      }
      activePageFlipRef.current = null
    }
  }, [isMobile])

  // Sync pageFlip layout and boxWidth on container resize, F11 fullscreen, and F12/visualViewport changes
  const hasPages = pages.length > 0
  useEffect(() => {
    const boxEl = viewerBoxRef.current
    if (!boxEl) return

    let rafId: number | null = null

    const syncSize = () => {
      rafId = null
      const nextWidth = Math.round(boxEl.getBoundingClientRect().width)
      if (nextWidth > 0 && nextWidth !== boxWidthRef.current) {
        boxWidthRef.current = nextWidth
        setBoxWidth(nextWidth)
      }
      const effectiveWidth = nextWidth > 0 ? nextWidth : (boxWidthRef.current || 300)
      const targetMinWidth = isMobileRef.current
        ? Math.max(100, Math.min(effectiveWidth, Math.ceil(effectiveWidth * 0.6)))
        : 100

      try {
        const pf = bookRef.current?.pageFlip()
        if (pf) {
          activePageFlipRef.current = pf
          const settings = pf.getSettings?.()
          if (settings) {
            settings.minWidth = targetMinWidth
            settings.minHeight = 100
          }
          const stfParent = boxEl.querySelector<HTMLElement>('.stf__parent')
          if (stfParent) {
            stfParent.style.minWidth = `${targetMinWidth * (isMobileRef.current ? 1 : 2)}px`
            stfParent.style.minHeight = '100px'
          }
          pf.update()
        }
      } catch {
        // Ignore if pageFlip instance is not ready yet
      }
    }

    const scheduleUpdate = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(syncSize)
    }

    scheduleUpdateRef.current = scheduleUpdate
    syncSize()

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          scheduleUpdate()
        })
      : null
    resizeObserver?.observe(boxEl)

    window.addEventListener('fullscreenchange', scheduleUpdate)
    document.addEventListener('fullscreenchange', scheduleUpdate)
    window.visualViewport?.addEventListener('resize', scheduleUpdate)

    return () => {
      scheduleUpdateRef.current = null
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      resizeObserver?.disconnect()
      window.removeEventListener('fullscreenchange', scheduleUpdate)
      document.removeEventListener('fullscreenchange', scheduleUpdate)
      window.visualViewport?.removeEventListener('resize', scheduleUpdate)
    }
  }, [hasPages])

  const handleFlipbookInit = useCallback(() => {
    try {
      activePageFlipRef.current = bookRef.current?.pageFlip() ?? null
    } catch {
      // Ignore if pageFlip instance is not ready yet
    }
    scheduleUpdateRef.current?.()
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
    if (pages.length === 0) return

    let isCancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const rafId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => {
        if (isCancelled) return
        prefetchSlidingWindow(pages, currentPage, {
          ahead: PAGES_AHEAD,
          behind: PAGES_BEHIND,
          concurrency: FLIPBOOK_PRELOAD.DECODE_CONCURRENCY,
        }).catch(() => {})
      }, 120)
    })

    return () => {
      isCancelled = true
      cancelAnimationFrame(rafId)
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }, [currentPage, pages])

  // Passive Background Idle Prefetch of Entire Magazine (Tier 3)
  useEffect(() => {
    const cancelIdle = idlePrefetchAllPages(pages, 0)
    return cancelIdle
  }, [pages])

  const onFlip = useCallback((flipEvent: FlipEvent) => {
    const pageNumber = ValidationHelpers.validateOrDefault(flipEvent.data, isNumber, 0, 'onFlip')
    currentPageRef.current = pageNumber
    windowStore.setPage(pageNumber)
    setCurrentPage(pageNumber)
    setPageAnnouncement(`Sayfa ${pageNumber + 1} / ${pages.length}`)

    if (pageNumber === lastTrackedPageRef.current) {
      if (isFirstFlipRef.current) {
        isFirstFlipRef.current = false
      }
      return
    }

    lastTrackedPageRef.current = pageNumber
    isFirstFlipRef.current = false
    triggerDynamicFlipSpeed()
    trackPageChange(pageNumber)
    pageFlipAudio.play()
  }, [pages.length, trackPageChange, triggerDynamicFlipSpeed, windowStore])

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
      windowStore.setPage(targetPageIndex)
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
  }, [triggerDynamicFlipSpeed, windowStore])

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

  const pageElements = useMemo(
    () =>
      pages.map((url, index) => (
        <FlipbookPage
          key={index}
          url={url}
          index={index}
          isMobile={isMobile}
          windowStore={windowStore}
          pagesAhead={PAGES_AHEAD}
          onImageError={handlePageImageError}
        />
      )),
    [pages, isMobile, windowStore]
  )

  if (!pages.length) return <div className="text-white">Geçerli sayfa bulunamadı.</div>

  const handleZoomIn = () => zoomRef.current?.zoomIn()
  const handleZoomOut = () => zoomRef.current?.zoomOut()
  const mobileMinWidth = Math.max(100, Math.min(boxWidth || 300, Math.ceil((boxWidth || 300) * 0.6)))

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
      <div ref={viewerBoxRef} className="w-full h-full overflow-hidden relative group">
        <ZoomContainer
          ref={zoomRef}
          minScale={1}
          maxScale={4}
          locked={isLocked}
          onZoomChange={setZoomLevel}
        >
          <SafeFlipBook
            key={isMobile ? 'portrait' : 'landscape'}
            ref={bookRef}
            width={848}
            height={1200}
            size="stretch"
            minWidth={isMobile ? mobileMinWidth : 100}
            maxWidth={2500}
            minHeight={100}
            maxHeight={3000}
            showCover
            maxShadowOpacity={FLIPBOOK_SETTINGS.MAX_SHADOW_OPACITY}
            drawShadow={FLIPBOOK_SETTINGS.DRAW_SHADOW}
            usePortrait={isMobile}
            startPage={currentPageRef.current}
            renderOnlyPageLengthChange={true}
            flippingTime={flippingTime}
            useMouseEvents={!isLocked && zoomLevel === 1}
            swipeDistance={30}
            showPageCorners={false}
            disableFlipByClick={isLocked || zoomLevel > 1}
            mobileScrollSupport={!isLocked && zoomLevel === 1}
            onInit={handleFlipbookInit}
            onFlip={onFlip}
            className="mx-auto"
            style={{ margin: '0 auto' }}
          >
            {pageElements}
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

