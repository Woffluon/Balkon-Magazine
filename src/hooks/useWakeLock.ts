import { useState, useEffect, useCallback, useRef } from 'react'
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

async function requestScreenSentinel(): Promise<WakeLockSentinel | null> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    logger.warn('Wake Lock API not supported', {
      operation: 'wake_lock_request'
    })
    return null
  }

  try {
    return await navigator.wakeLock.request('screen')
  } catch (error) {
    logger.warn('Wake lock request failed', {
      error,
      operation: 'wake_lock_request'
    })
    return null
  }
}

async function releaseSentinel(
  sentinel: WakeLockSentinel,
  operation: 'wake_lock_release' | 'wake_lock_cleanup'
): Promise<void> {
  try {
    await sentinel.release()
  } catch (error) {
    logger.warn(
      operation === 'wake_lock_cleanup'
        ? 'Wake lock cleanup failed'
        : 'Wake lock release failed',
      {
        error,
        operation
      }
    )
  }
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
  const [isActive, setIsActive] = useState<boolean>(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const isMountedRef = useRef<boolean>(true)

  const attachSentinel = useCallback((lock: WakeLockSentinel) => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      void releaseSentinel(lock, 'wake_lock_cleanup')
      return
    }

    wakeLockRef.current = lock
    setIsActive(true)

    // Listen for wake lock release (e.g., user switches tabs)
    lock.addEventListener('release', () => {
      if (wakeLockRef.current === lock) {
        wakeLockRef.current = null
      }
      if (isMountedRef.current) {
        setIsActive(false)
      }
    })
  }, [])

  const acquireLock = useCallback(
    async (isCancelled?: () => boolean): Promise<void> => {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        return
      }

      const lock = await requestScreenSentinel()
      if (!lock) {
        if (!isCancelled?.() && isMountedRef.current) {
          setIsActive(false)
        }
        return
      }

      if (isCancelled?.() || !isMountedRef.current) {
        await releaseSentinel(lock, 'wake_lock_cleanup')
        return
      }

      attachSentinel(lock)
    },
    [attachSentinel]
  )

  /**
   * Requests a wake lock to prevent screen sleep
   * 
   * Checks for Wake Lock API availability before requesting.
   * Handles errors gracefully (e.g., user denied permission).
   */
  const request = useCallback(async (): Promise<void> => {
    await acquireLock()
  }, [acquireLock])

  /**
   * Releases the current wake lock
   * 
   * Allows the screen to sleep again.
   * Safe to call even if no wake lock is active.
   */
  const release = useCallback(async (): Promise<void> => {
    const currentLock = wakeLockRef.current
    if (!currentLock) {
      return
    }

    wakeLockRef.current = null
    try {
      await releaseSentinel(currentLock, 'wake_lock_release')
    } finally {
      if (isMountedRef.current) {
        setIsActive(false)
      }
    }
  }, [])

  /**
   * Auto-request wake lock when enabled
   * 
   * Automatically requests wake lock when enabled prop becomes true,
   * and releases it when enabled becomes false.
   */
  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    void acquireLock(() => cancelled)

    return () => {
      cancelled = true
      const currentLock = wakeLockRef.current
      if (currentLock) {
        wakeLockRef.current = null
        void releaseSentinel(currentLock, 'wake_lock_cleanup').finally(() => {
          if (isMountedRef.current) {
            setIsActive(false)
          }
        })
      }
    }
  }, [enabled, acquireLock])

  /**
   * Auto-release on unmount
   * 
   * Ensures wake lock is always released when component unmounts
   * to prevent battery drain.
   */
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      const currentLock = wakeLockRef.current
      if (currentLock) {
        wakeLockRef.current = null
        void releaseSentinel(currentLock, 'wake_lock_cleanup')
      }
    }
  }, [])

  return {
    isActive,
    request,
    release
  }
}
