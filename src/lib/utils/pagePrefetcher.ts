import { FLIPBOOK_PRELOAD } from '@/lib/constants/flipbook'

/**
 * In-memory cache of already decoded image URLs to prevent redundant decode operations.
 */
export const decodedCache = new Set<string>()

/**
 * Resets the decoded image cache (primarily for testing and cache invalidation).
 */
export function clearDecodedCache(): void {
  decodedCache.clear()
}

/**
 * Checks if client is on Save-Data mode or low power / restricted network.
 * If true, aggressive background prefetching should be skipped.
 */
export function isLowPowerOrSaveData(): boolean {
  if (typeof navigator === 'undefined') return false
  const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection
  return Boolean(conn?.saveData)
}

/**
 * Pre-decodes an image off the main thread using the browser's native `img.decode()`.
 * Prevents UI micro-stutters (zero-jank) when turning pages in the flipbook.
 *
 * @param url The image URL to decode and cache
 * @returns Promise resolving to true if decoded/cached successfully, false otherwise
 */
export async function decodeImage(url: string): Promise<boolean> {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return false
  }

  const cleanUrl = url.trim()
  if (decodedCache.has(cleanUrl)) {
    return true
  }

  // Handle SSR / non-browser environments gracefully
  if (typeof Image === 'undefined') {
    decodedCache.add(cleanUrl)
    return true
  }

  return new Promise<boolean>((resolve) => {
    try {
      const img = new Image()
      img.src = cleanUrl

      if ('decode' in img && typeof img.decode === 'function') {
        img
          .decode()
          .then(() => {
            decodedCache.add(cleanUrl)
            resolve(true)
          })
          .catch(() => {
            resolve(false)
          })
      } else {
        img.onload = () => {
          decodedCache.add(cleanUrl)
          resolve(true)
        }
        img.onerror = () => {
          resolve(false)
        }
      }
    } catch {
      resolve(false)
    }
  })
}

export interface SlidingWindowOptions {
  ahead?: number
  behind?: number
}

/**
 * Prefetches and decodes a sliding window of pages around the active page index.
 * Pages immediately ahead and behind are prioritized to guarantee instant page flips.
 *
 * @param urls Array of all magazine page URLs
 * @param currentPage Current active page index (0-based)
 * @param options Ahead and behind page window sizes
 * @returns Array of URLs that were prefetched
 */
export async function prefetchSlidingWindow(
  urls: string[],
  currentPage: number,
  options?: SlidingWindowOptions
): Promise<string[]> {
  if (!urls || urls.length === 0) {
    return []
  }

  const ahead = options?.ahead ?? FLIPBOOK_PRELOAD.PAGES_AHEAD
  const behind = options?.behind ?? FLIPBOOK_PRELOAD.PAGES_BEHIND

  const startIndex = Math.max(0, currentPage - behind)
  const endIndex = Math.min(urls.length - 1, currentPage + ahead)

  // Prioritize current page, then pages ahead, then pages behind
  const priorityIndices: number[] = []

  if (currentPage >= 0 && currentPage < urls.length) {
    priorityIndices.push(currentPage)
  }

  for (let i = 1; i <= ahead; i++) {
    const idx = currentPage + i
    if (idx <= endIndex && idx >= startIndex) {
      priorityIndices.push(idx)
    }
  }

  for (let i = 1; i <= behind; i++) {
    const idx = currentPage - i
    if (idx >= startIndex && idx <= endIndex) {
      priorityIndices.push(idx)
    }
  }

  const targetUrls = priorityIndices
    .map((idx) => urls[idx])
    .filter((url): url is string => Boolean(url))

  await Promise.all(targetUrls.map((url) => decodeImage(url)))

  return targetUrls
}

/**
 * Passively prefetches all remaining magazine pages during browser idle periods
 * via requestIdleCallback (with setTimeout fallback).
 *
 * @param urls All magazine page URLs
 * @param startPage Initial page index to start prefetching outward from (defaults to 0)
 * @returns A cancellation function to stop idle prefetching
 */
export function idlePrefetchAllPages(urls: string[], startPage = 0): () => void {
  if (!urls || urls.length === 0 || isLowPowerOrSaveData()) {
    return () => {}
  }

  let isCancelled = false
  let idleHandle: number | ReturnType<typeof setTimeout> | null = null

  // Order remaining pages starting from startPage onwards, then wrap around
  const pendingIndices: number[] = []
  const safeStart = Math.max(0, Math.min(urls.length - 1, startPage))

  for (let i = safeStart; i < urls.length; i++) {
    pendingIndices.push(i)
  }
  for (let i = 0; i < safeStart; i++) {
    pendingIndices.push(i)
  }

  const scheduleNext = () => {
    if (isCancelled || pendingIndices.length === 0) return

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = (window as unknown as { requestIdleCallback: (cb: (deadline: { timeRemaining: () => number, didTimeout: boolean }) => void, opts?: { timeout: number }) => number }).requestIdleCallback(
        async (deadline) => {
          while (
            !isCancelled &&
            pendingIndices.length > 0 &&
            (deadline.timeRemaining() > 0 || deadline.didTimeout)
          ) {
            const idx = pendingIndices.shift()
            if (idx !== undefined) {
              const url = urls[idx]
              if (url && !decodedCache.has(url)) {
                await decodeImage(url)
              }
            }
          }

          if (!isCancelled && pendingIndices.length > 0) {
            scheduleNext()
          }
        },
        { timeout: 2000 }
      )
    } else {
      idleHandle = setTimeout(async () => {
        if (isCancelled || pendingIndices.length === 0) return
        const idx = pendingIndices.shift()
        if (idx !== undefined) {
          const url = urls[idx]
          if (url && !decodedCache.has(url)) {
            await decodeImage(url)
          }
        }
        if (!isCancelled && pendingIndices.length > 0) {
          scheduleNext()
        }
      }, 50)
    }
  }

  scheduleNext()

  return () => {
    isCancelled = true
    if (idleHandle !== null) {
      if (
        typeof window !== 'undefined' &&
        'cancelIdleCallback' in window &&
        typeof idleHandle === 'number'
      ) {
        ;(window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleHandle)
      } else {
        clearTimeout(idleHandle)
      }
    }
  }
}
