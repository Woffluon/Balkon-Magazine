'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PageFlipAPI = { flipNext: () => void; flipPrev: () => void; getCurrentPageIndex: () => number }
type PageFlipHandle = { pageFlip: () => PageFlipAPI }

type FlipBookComponent = React.ComponentType<{
  width?: number;
  height?: number;
  showCover?: boolean;
  className?: string;
  size?: 'fixed' | 'stretch';
  maxShadowOpacity?: number;
  drawShadow?: boolean;
  usePortrait?: boolean;
  mobileScrollSupport?: boolean;
  onFlip?: (e: { data: number }) => void;
} & { children?: React.ReactNode }>
const SafeFlipBook = dynamic(() => import('react-pageflip'), {
  ssr: false,
  loading: () => <div className="h-[700px] flex items-center justify-center text-sm text-muted-foreground">Yükleniyor...</div>,
}) as FlipBookComponent

interface FlipbookViewerProps {
  imageUrls: string[]
}

const ASPECT_W = 848
const ASPECT_H = 1200

export default React.memo(function FlipbookViewer({ imageUrls }: FlipbookViewerProps) {
  const pages = useMemo(() => (imageUrls ?? []).filter(Boolean), [imageUrls])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const bookRef = useRef<PageFlipHandle | null>(null)
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 500, h: 700 })
  const [currentPage, setCurrentPage] = useState(0)
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set())
  const [pageAnnouncement, setPageAnnouncement] = useState('')

  useEffect(() => {
    function updateSize() {
      const el = containerRef.current
      const maxW = Math.max(300, Math.min(900, el?.clientWidth || 500))
      
      // Use visualViewport API for mobile keyboard detection
      const visualViewport = typeof window !== 'undefined' && 'visualViewport' in window ? window.visualViewport : null
      const viewportH = visualViewport ? visualViewport.height : (typeof window !== 'undefined' ? window.innerHeight : 900)
      
      const maxH = Math.floor(viewportH * 0.85)
      const hFromW = Math.floor(maxW * ASPECT_H / ASPECT_W)
      if (hFromW > maxH) {
        const wFromH = Math.floor(maxH * ASPECT_W / ASPECT_H)
        setDims({ w: wFromH, h: maxH })
      } else {
        setDims({ w: maxW, h: hFromW })
      }
    }
    updateSize()
    
    // ResizeObserver for container changes
    const ro = new ResizeObserver(() => updateSize())
    if (containerRef.current) ro.observe(containerRef.current)
    
    // visualViewport listener for mobile keyboard
    const visualViewport = typeof window !== 'undefined' && 'visualViewport' in window ? window.visualViewport : null
    if (visualViewport) {
      visualViewport.addEventListener('resize', updateSize)
    }
    
    return () => {
      ro.disconnect()
      if (visualViewport) {
        visualViewport.removeEventListener('resize', updateSize)
      }
    }
  }, [])

  // Image preload with AbortController
  useEffect(() => {
    const abortController = new AbortController()
    const { signal } = abortController
    
    const nextIndices = [currentPage + 1, currentPage + 2, currentPage + 3]
    nextIndices.forEach((idx) => {
      if (idx < pages.length && !preloadedPages.has(idx)) {
        const img = new window.Image()
        img.onload = () => {
          if (!signal.aborted) {
            setPreloadedPages((prev) => new Set([...prev, idx]))
          }
        }
        img.onerror = (error) => {
          if (!signal.aborted) {
            console.warn(`Failed to preload page ${idx}:`, error)
          }
        }
        img.src = pages[idx]
      }
    })
    
    return () => abortController.abort()
  }, [currentPage, pages, preloadedPages])

  const onFlip = useCallback((e: { data: number }) => {
    setCurrentPage(e.data)
    // Announce page change to screen readers
    setPageAnnouncement(`Sayfa ${e.data + 1} / ${pages.length}`)
  }, [pages.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!bookRef.current) return
      if (e.key === 'ArrowRight') {
        bookRef.current.pageFlip().flipNext()
        // Get updated page index and announce
        const newPage = bookRef.current.pageFlip().getCurrentPageIndex()
        setPageAnnouncement(`Sayfa ${newPage + 1} / ${pages.length}`)
      }
      if (e.key === 'ArrowLeft') {
        bookRef.current.pageFlip().flipPrev()
        // Get updated page index and announce
        const newPage = bookRef.current.pageFlip().getCurrentPageIndex()
        setPageAnnouncement(`Sayfa ${newPage + 1} / ${pages.length}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pages.length])

  if (!pages.length) {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center"
        role="status"
        aria-live="polite"
      >
        {/* Book illustration */}
        <svg
          className="w-24 h-24 mb-6 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Dergi Sayfaları Bulunamadı
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-6 max-w-md">
          Bu dergi için henüz sayfa yüklenmemiş veya sayfalar geçici olarak kullanılamıyor. 
          Lütfen sayfayı yenilemeyi deneyin veya daha sonra tekrar kontrol edin.
        </p>

        {/* Refresh button */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:scale-95 transition-all duration-200 font-medium text-sm"
          aria-label="Sayfayı yenile"
        >
          Sayfayı Yenile
        </button>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className="relative w-full flex justify-center items-center overflow-hidden" 
      style={{ height: dims.h }}
      role="region"
      aria-label="Dergi görüntüleyici"
      aria-describedby="flipbook-instructions"
    >
      {/* Live region for page announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {pageAnnouncement}
      </div>

      {/* Keyboard instructions for screen readers */}
      <div id="flipbook-instructions" className="sr-only">
        Sol ve sağ ok tuşlarını kullanarak sayfa çevirebilirsiniz
      </div>

      {/* Flipbook */}
      {/* @ts-expect-error: react-pageflip type doesn't include ref but runtime supports it */}
      <SafeFlipBook ref={bookRef} width={dims.w} height={dims.h} showCover size="fixed" maxShadowOpacity={0} drawShadow={false} usePortrait mobileScrollSupport onFlip={onFlip}>
        {pages.map((url, index) => {
          const shouldLoad = index === currentPage || index === currentPage - 1 || (index > currentPage && index <= currentPage + 3) || preloadedPages.has(index)
          const shouldPrioritize = index >= currentPage && index <= currentPage + 3
          
          return (
            <div key={index} className="page overflow-hidden" style={{ width: dims.w, height: dims.h }}>
              {shouldLoad ? (
                <Image
                  src={url}
                  alt={`Dergi Sayfası ${index + 1}`}
                  width={dims.w}
                  height={dims.h}
                  priority={shouldPrioritize}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              ) : (
                <div aria-hidden className="w-full h-full bg-neutral-100" />
              )}
            </div>
          )
        })}
      </SafeFlipBook>

      {/* Tap zones for mobile */}
      <div onClick={() => bookRef.current?.pageFlip().flipPrev()} className="absolute inset-y-0 left-0 w-1/3 z-10 md:hidden" aria-hidden="true" />
      <div onClick={() => bookRef.current?.pageFlip().flipNext()} className="absolute inset-y-0 right-0 w-1/3 z-10 md:hidden" aria-hidden="true" />

      {/* Navigation arrows */}
      <button
        type="button"
        aria-label="Önceki sayfa"
        onClick={() => bookRef.current?.pageFlip().flipPrev()}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            bookRef.current?.pageFlip().flipPrev();
          }
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-3 md:p-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 active:scale-95"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>
      <button
        type="button"
        aria-label="Sonraki sayfa"
        onClick={() => bookRef.current?.pageFlip().flipNext()}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            bookRef.current?.pageFlip().flipNext();
          }
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-3 md:p-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 active:scale-95"
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Page indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-black/60 text-white text-sm font-medium">
        {currentPage + 1} / {pages.length}
      </div>
    </div>
  )
})

