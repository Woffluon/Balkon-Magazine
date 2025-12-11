import { RefObject, useEffect, useState } from 'react'
import { APP_CONFIG } from '@/lib/config/app-config'

/**
 * Aspect ratio interface for dimension calculations
 */
export interface AspectRatio {
  w: number
  h: number
}

/**
 * Dimensions interface for width and height
 */
export interface Dimensions {
  w: number
  h: number
}

/**
 * Custom hook for responsive dimension management with aspect ratio constraints
 * 
 * This hook observes container size changes using ResizeObserver and calculates
 * responsive dimensions while maintaining the specified aspect ratio and respecting
 * viewport constraints. It includes debouncing to prevent excessive re-renders.
 * 
 * @param containerRef - Reference to the container element to observe
 * @param aspectRatio - Desired aspect ratio (width/height ratio)
 * @returns Calculated dimensions that maintain aspect ratio within viewport constraints
 * 
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null)
 * const dims = useResponsiveDimensions(containerRef, { w: 848, h: 1200 })
 * 
 * return (
 *   <div ref={containerRef}>
 *     <FlipBook width={dims.w} height={dims.h} />
 *   </div>
 * )
 * ```
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function useResponsiveDimensions(
  containerRef: RefObject<HTMLElement | null>,
  aspectRatio: AspectRatio
): Dimensions {
  const [dims, setDims] = useState<Dimensions>({ 
    w: APP_CONFIG.magazine.viewport.defaultWidth, 
    h: APP_CONFIG.magazine.viewport.defaultHeight 
  })

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    /**
     * Calculate responsive dimensions based on container size and aspect ratio
     * Respects viewport constraints and maintains aspect ratio
     */
    function updateSize() {
      // Clear any pending debounced update
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Debounce the dimension calculation to prevent excessive re-renders (Requirement 4.4)
      timeoutId = setTimeout(() => {
        const el = containerRef.current
        if (!el) return

        // Calculate maximum width from container, with reasonable bounds
        const { minWidth, maxWidth, defaultWidth } = APP_CONFIG.magazine.viewport
        const maxW = Math.max(minWidth, Math.min(maxWidth, el.clientWidth || defaultWidth))

        // Use visualViewport API for accurate viewport height (handles mobile keyboard)
        const visualViewport =
          typeof window !== 'undefined' && 'visualViewport' in window
            ? window.visualViewport
            : null
        const { heightRatio, defaultHeight } = APP_CONFIG.magazine.viewport
        const viewportH = visualViewport
          ? visualViewport.height
          : typeof window !== 'undefined'
            ? window.innerHeight
            : defaultHeight

        // Calculate maximum height using configured ratio (Requirement 4.3)
        const maxH = Math.floor(viewportH * heightRatio)

        // Calculate height from width based on aspect ratio
        const hFromW = Math.floor((maxW * aspectRatio.h) / aspectRatio.w)

        // Maintain aspect ratio while respecting viewport constraints (Requirement 4.3)
        if (hFromW > maxH) {
          // Height constraint is limiting, calculate width from height
          const wFromH = Math.floor((maxH * aspectRatio.w) / aspectRatio.h)
          setDims({ w: wFromH, h: maxH })
        } else {
          // Width constraint is limiting, use calculated height
          setDims({ w: maxW, h: hFromW })
        }
      }, 100) // 100ms debounce delay for performance
    }

    // Initial size calculation
    updateSize()

    // Use ResizeObserver for container size changes (Requirement 4.2)
    const resizeObserver = new ResizeObserver(() => {
      updateSize()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    // Listen to visualViewport resize for mobile keyboard detection
    const visualViewport =
      typeof window !== 'undefined' && 'visualViewport' in window
        ? window.visualViewport
        : null

    if (visualViewport) {
      visualViewport.addEventListener('resize', updateSize)
    }

    // Cleanup function to prevent memory leaks (Requirement 4.5)
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      resizeObserver.disconnect()
      if (visualViewport) {
        visualViewport.removeEventListener('resize', updateSize)
      }
    }
  }, [containerRef, aspectRatio.w, aspectRatio.h])

  return dims
}
