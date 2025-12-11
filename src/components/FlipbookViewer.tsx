'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

const SafeFlipBook = dynamic(() => import('react-pageflip'), {
  ssr: false,
  loading: () => <div className={`h-[${APP_CONFIG.magazine.viewport.loadingHeight}px] flex items-center justify-center text-sm text-muted-foreground`}>Yükleniyor...</div>,
})

interface FlipbookViewerProps {
  imageUrls: string[]
}

/**
 * Validates image URLs array using type guards
 * Ensures all URLs are valid strings and filters out invalid entries
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
        logger.debug('Filtering out invalid image URL', {
          component: 'FlipbookViewer',
          operation: 'validateImageUrls',
          url: String(url),
          urlType: typeof url
        })
        return false
      }
      return true
    })
    .map(url => url.trim())
}

export default React.memo(function FlipbookViewer({ imageUrls }: FlipbookViewerProps) {
  // Validate and sanitize image URLs using type guards (Requirement 7.2)
  const pages = useMemo(() => validateImageUrls(imageUrls), [imageUrls])
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<PageFlipHandle | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set())
  const [failedPages, setFailedPages] = useState<Set<number>>(new Set())
  const [pageAnnouncement, setPageAnnouncement] = useState('')

  // Use custom hook for responsive dimensions (Requirements: 4.1, 4.2, 4.3, 4.4, 4.5)
  const dimensions = useResponsiveDimensions(containerRef, { 
    w: APP_CONFIG.magazine.aspectRatio.width, 
    h: APP_CONFIG.magazine.aspectRatio.height 
  })

  // Image preload with standardized async patterns (Requirements 7.1, 7.3)
  // Uses standardized promise creation with proper error handling and cleanup
  useEffect(() => {
    const abortController = new AbortController()
    const { signal } = abortController
    
    const { pagesAhead } = APP_CONFIG.magazine.preload
    const nextIndices = Array.from({ length: pagesAhead }, (_, i) => currentPage + i + 1)
    
    // Process preloading with standardized async patterns
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
              
              const cleanup = () => {
                img.onload = null
                img.onerror = null
              }
              
              img.onload = () => {
                if (!signal.aborted) {
                  setPreloadedPages(prev => new Set([...prev, idx]))
                  logger.debug('Image preloaded successfully', {
                    component: 'FlipbookViewer',
                    operation: 'preloadImage',
                    pageIndex: idx,
                    totalPages: pages.length
                  })
                }
                resolve()
              }
              
              img.onerror = (error) => {
                if (!signal.aborted) {
                  setFailedPages(prev => new Set([...prev, idx]))
                  logger.warn('Image preload failed, will show placeholder', {
                    component: 'FlipbookViewer',
                    operation: 'preloadImage',
                    pageIndex: idx,
                    error: error instanceof Event ? 'Image load error' : String(error)
                  })
                }
                resolve() // Don't reject, just mark as failed
              }
              
              img.src = pages[idx]
              return cleanup
            },
            {
              timeout: APP_CONFIG.system.performance.maxExecutionTime,
              context: { 
                component: 'FlipbookViewer', 
                operation: 'preloadImage',
                pageIndex: idx 
              }
            }
          )
        )
      
      // Execute preloading operations with proper error handling
      if (preloadPromises.length > 0) {
        const result = await executeAsyncOperation(
          () => Promise.allSettled(preloadPromises),
          {
            component: 'FlipbookViewer',
            operation: 'preloadImages',
            imageCount: preloadPromises.length
          }
        )
        
        if (!result.success) {
          logger.error('Image preloading operation failed', {
            component: 'FlipbookViewer',
            operation: 'preloadImages',
            error: result.error.message
          })
        }
      }
    }
    
    preloadImages().catch(error => {
      logger.error('Unexpected error in image preloading', {
        component: 'FlipbookViewer',
        operation: 'preloadImages',
        error: error instanceof Error ? error.message : String(error)
      })
    })
    
    return () => abortController.abort()
  }, [currentPage, pages, preloadedPages, failedPages])

  const onFlip = useCallback((flipEvent: FlipEvent) => {
    // Validate flip event data using type guards (Requirement 7.2)
    const pageNumber = ValidationHelpers.validateOrDefault(
      flipEvent.data,
      isNumber,
      0,
      'FlipbookViewer.onFlip'
    )
    
    setCurrentPage(pageNumber)
    
    // Announce page change to screen readers
    const announcement = `Sayfa ${pageNumber + 1} / ${pages.length}`
    setPageAnnouncement(announcement)
    
    logger.debug('Page flip completed', {
      component: 'FlipbookViewer',
      operation: 'onFlip',
      currentPage: pageNumber,
      totalPages: pages.length
    })
  }, [pages.length])

  useEffect(() => {
    const handleKeyboardNavigation = (keyboardEvent: KeyboardEvent) => {
      if (!bookRef.current) {
        logger.debug('Keyboard navigation ignored - no book reference', {
          component: 'FlipbookViewer',
          operation: 'handleKeyboardNavigation',
          key: keyboardEvent.key
        })
        return
      }
      
      try {
        let newPageIndex: number | undefined
        
        if (keyboardEvent.key === 'ArrowRight') {
          bookRef.current.pageFlip().flipNext()
          newPageIndex = bookRef.current.pageFlip().getCurrentPageIndex()
          
          logger.debug('Keyboard navigation: next page', {
            component: 'FlipbookViewer',
            operation: 'handleKeyboardNavigation',
            newPage: newPageIndex,
            totalPages: pages.length
          })
        } else if (keyboardEvent.key === 'ArrowLeft') {
          bookRef.current.pageFlip().flipPrev()
          newPageIndex = bookRef.current.pageFlip().getCurrentPageIndex()
          
          logger.debug('Keyboard navigation: previous page', {
            component: 'FlipbookViewer',
            operation: 'handleKeyboardNavigation',
            newPage: newPageIndex,
            totalPages: pages.length
          })
        }
        
        // Validate and announce page change
        if (TypeGuards.isNumber(newPageIndex)) {
          const announcement = `Sayfa ${newPageIndex + 1} / ${pages.length}`
          setPageAnnouncement(announcement)
        }
      } catch (error) {
        const handledError = ErrorHandler.handleUnknownError(error)
        logger.error('Keyboard navigation failed', {
          component: 'FlipbookViewer',
          operation: 'handleKeyboardNavigation',
          key: keyboardEvent.key,
          error: handledError.message
        })
      }
    }
    
    window.addEventListener('keydown', handleKeyboardNavigation)
    return () => window.removeEventListener('keydown', handleKeyboardNavigation)
  }, [pages.length])

  if (!pages.length) {
    return (
      <div 
        className={`flex flex-col items-center justify-center min-h-[${APP_CONFIG.magazine.viewport.defaultWidth}px] p-8 text-center`}
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
      style={{ height: dimensions.h }}
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
      <SafeFlipBook ref={bookRef} width={dimensions.w} height={dimensions.h} showCover size="fixed" maxShadowOpacity={0} drawShadow={false} usePortrait mobileScrollSupport onFlip={onFlip}>
        {pages.map((url, index) => {
          const { pagesAhead, preloadCurrent, preloadPrevious } = APP_CONFIG.magazine.preload
          const shouldLoad = (preloadCurrent && index === currentPage) || 
                           (preloadPrevious && index === currentPage - 1) || 
                           (index > currentPage && index <= currentPage + pagesAhead) || 
                           preloadedPages.has(index)
          const shouldPrioritize = index >= currentPage && index <= currentPage + pagesAhead
          const hasFailed = failedPages.has(index)
          
          return (
            <div key={index} className="page overflow-hidden" style={{ width: dimensions.w, height: dimensions.h }}>
              {hasFailed ? (
                // Show error placeholder for failed images
                <div className="w-full h-full bg-neutral-100 flex flex-col items-center justify-center text-neutral-500">
                  <svg
                    className="w-16 h-16 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm">Sayfa yüklenemedi</span>
                </div>
              ) : shouldLoad ? (
                <Image
                  src={url}
                  alt={`Dergi Sayfası ${index + 1}`}
                  width={dimensions.w}
                  height={dimensions.h}
                  priority={shouldPrioritize}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  onError={(imageError) => {
                    // Handle image load error with proper logging (Requirement 4.1)
                    setFailedPages((prev) => new Set([...prev, index]))
                    
                    logger.warn('Image component failed to load', {
                      component: 'FlipbookViewer',
                      operation: 'imageOnError',
                      pageIndex: index,
                      imageUrl: url,
                      error: imageError instanceof Event ? 'Image load error' : String(imageError)
                    })
                  }}
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

