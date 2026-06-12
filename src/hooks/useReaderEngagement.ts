import { useEffect, useRef, useCallback } from 'react'
import { trackPageEngagement } from '@/app/actions/analytics-actions'
import { logger } from '@/lib/services/Logger'

export interface PageEngagementEvent {
  magazineId: string
  pageNumber: number // 1-indexed for reader clarity
  durationSeconds: number
}

/**
 * Custom hook to track reader engagement metrics on a page-by-page level.
 * Handles client-side buffering (up to 5 events or 10-second timeout),
 * visibility changes (pausing on tab background/blur), and page duration caps.
 */
export function useReaderEngagement(magazineId: string, initialPageIndex: number) {
  const currentPageRef = useRef<number>(initialPageIndex)
  const startTimeRef = useRef<number | null>(null)
  const accumulatedTimeRef = useRef<number>(0)
  const bufferRef = useRef<PageEngagementEvent[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Start the tracking timer
  const resumeTimer = useCallback(() => {
    if (!magazineId || magazineId === 'default-mag') return
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now()
    }
  }, [magazineId])

  // Pause the tracking timer and accumulate time
  const pauseTimer = useCallback(() => {
    if (startTimeRef.current !== null) {
      accumulatedTimeRef.current += Date.now() - startTimeRef.current
      startTimeRef.current = null
    }
  }, [])

  // Flush the event buffer immediately via Server Action
  const flushBuffer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (bufferRef.current.length === 0) return

    const eventsToSend = [...bufferRef.current]
    bufferRef.current = []

    trackPageEngagement(eventsToSend).catch((error) => {
      logger.error('Failed to send page engagement events', {
        component: 'useReaderEngagement',
        operation: 'flushBuffer',
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }, [])

  // Add a tracking event to the buffer
  const addToBuffer = useCallback((event: PageEngagementEvent) => {
    bufferRef.current.push(event)

    if (bufferRef.current.length >= 5) {
      flushBuffer()
    } else if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        flushBuffer()
      }, 10000)
    }
  }, [flushBuffer])

  // Calculate and record engagement for the active page
  const recordEngagement = useCallback(() => {
    if (!magazineId || magazineId === 'default-mag') return

    let durationMs = accumulatedTimeRef.current
    accumulatedTimeRef.current = 0

    if (startTimeRef.current !== null) {
      durationMs += Date.now() - startTimeRef.current
      startTimeRef.current = Date.now() // Reset start time for continued reading
    }

    const durationSec = Math.round(durationMs / 1000)

    // Discard durations < 1 second (accidental flips)
    if (durationSec >= 1) {
      // Cap durations at 10 minutes (600 seconds) to prevent idle outliers
      const cappedDuration = Math.min(durationSec, 600)
      const event: PageEngagementEvent = {
        magazineId,
        pageNumber: currentPageRef.current + 1, // Convert 0-indexed index to 1-indexed page number
        durationSeconds: cappedDuration,
      }
      addToBuffer(event)
    }
  }, [magazineId, addToBuffer])

  // Track page transitions
  const trackPageChange = useCallback((nextPageIndex: number) => {
    if (!magazineId || magazineId === 'default-mag') return

    // Record engagement for the page we are leaving
    recordEngagement()

    // Switch active page tracking reference
    currentPageRef.current = nextPageIndex
    accumulatedTimeRef.current = 0
    if (startTimeRef.current !== null) {
      startTimeRef.current = Date.now()
    }
  }, [magazineId, recordEngagement])

  // Initialize and clean up hook timers
  useEffect(() => {
    if (!magazineId || magazineId === 'default-mag') return

    startTimeRef.current = Date.now()
    accumulatedTimeRef.current = 0

    return () => {
      pauseTimer()
      recordEngagement()
      flushBuffer()
    }
  }, [magazineId, pauseTimer, recordEngagement, flushBuffer])

  // Handle visibility changes (minimize, tab change, screen lock)
  useEffect(() => {
    if (!magazineId || magazineId === 'default-mag') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pauseTimer()
        recordEngagement()
        flushBuffer()
      } else {
        resumeTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [magazineId, pauseTimer, resumeTimer, recordEngagement, flushBuffer])

  return {
    trackPageChange,
    flushBuffer,
  }
}
