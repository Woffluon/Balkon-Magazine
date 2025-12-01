import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/services/Logger'

/**
 * Wake lock return interface
 * Provides wake lock control and status
 */
export interface UseWakeLockReturn {
  /** Whether wake lock is currently active */
  isActive: boolean
  /** Requests a wake lock to prevent screen sleep */
  request: () => Promise<void>
  /** Releases the current wake lock */
  release: () => Promise<void>
}

/**
 * Custom hook for managing screen wake lock
 * 
 * Provides a simple interface to request and release wake locks,
 * preventing the screen from sleeping during long-running operations
 * like file uploads. Automatically releases wake lock on unmount.
 * 
 * Satisfies Requirement 2.4: Wake lock request and release
 * 
 * @param enabled - Whether wake lock should be automatically requested
 * @returns Wake lock control methods and status
 * 
 * @example
 * ```tsx
 * function UploadComponent() {
 *   const [isUploading, setIsUploading] = useState(false)
 *   const { isActive, request, release } = useWakeLock(isUploading)
 *   
 *   const handleUpload = async () => {
 *     setIsUploading(true)
 *     await request() // Request wake lock
 *     
 *     try {
 *       // Perform upload...
 *     } finally {
 *       await release() // Release wake lock
 *       setIsUploading(false)
 *     }
 *   }
 *   
 *   return (
 *     <div>
 *       <button onClick={handleUpload}>Upload</button>
 *       {isActive && <div>Screen lock active</div>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useWakeLock(enabled: boolean = false): UseWakeLockReturn {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  const [isActive, setIsActive] = useState<boolean>(false)

  /**
   * Requests a wake lock to prevent screen sleep
   * 
   * Checks for Wake Lock API availability before requesting.
   * Handles errors gracefully (e.g., user denied permission).
   */
  const request = useCallback(async (): Promise<void> => {
    // Check if Wake Lock API is available
    if (!('wakeLock' in navigator)) {
      logger.warn('Wake Lock API not supported', {
        operation: 'wake_lock_request'
      })
      return
    }

    try {
      const lock = await navigator.wakeLock.request('screen')
      setWakeLock(lock)
      setIsActive(true)

      // Listen for wake lock release (e.g., user switches tabs)
      lock.addEventListener('release', () => {
        setIsActive(false)
      })
    } catch (error) {
      logger.warn('Wake lock request failed', {
        error,
        operation: 'wake_lock_request'
      })
      setIsActive(false)
    }
  }, [])

  /**
   * Releases the current wake lock
   * 
   * Allows the screen to sleep again.
   * Safe to call even if no wake lock is active.
   */
  const release = useCallback(async (): Promise<void> => {
    if (wakeLock) {
      try {
        await wakeLock.release()
      } catch (error) {
        logger.warn('Wake lock release failed', {
          error,
          operation: 'wake_lock_release'
        })
      } finally {
        setWakeLock(null)
        setIsActive(false)
      }
    }
  }, [wakeLock])

  /**
   * Auto-request wake lock when enabled
   * 
   * Automatically requests wake lock when enabled prop becomes true,
   * and releases it when enabled becomes false.
   */
  useEffect(() => {
    if (enabled && !isActive) {
      request()
    } else if (!enabled && isActive) {
      release()
    }
  }, [enabled, isActive, request, release])

  /**
   * Auto-release on unmount
   * 
   * Ensures wake lock is always released when component unmounts
   * to prevent battery drain.
   */
  useEffect(() => {
    return () => {
      if (wakeLock) {
        wakeLock.release().catch((error) => {
          logger.warn('Wake lock cleanup failed', {
            error,
            operation: 'wake_lock_cleanup'
          })
        })
      }
    }
  }, [wakeLock])

  return {
    isActive,
    request,
    release
  }
}
