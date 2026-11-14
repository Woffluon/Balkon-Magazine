import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import {
  decodeImage,
  prefetchSlidingWindow,
  idlePrefetchAllPages,
  isLowPowerOrSaveData,
  decodedCache,
  clearDecodedCache,
} from '../pagePrefetcher'

describe('pagePrefetcher', () => {
  const originalImage = globalThis.Image
  const originalNavigator = globalThis.navigator

  beforeEach(() => {
    clearDecodedCache()
  })

  afterEach(() => {
    globalThis.Image = originalImage
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      })
    }
  })

  describe('isLowPowerOrSaveData', () => {
    it('returns false when navigator or connection is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        configurable: true,
        writable: true,
      })
      assert.strictEqual(isLowPowerOrSaveData(), false)
    })

    it('returns true when connection.saveData is true', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          connection: { saveData: true },
        },
        configurable: true,
        writable: true,
      })
      assert.strictEqual(isLowPowerOrSaveData(), true)
    })

    it('returns false when connection.saveData is false', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          connection: { saveData: false },
        },
        configurable: true,
        writable: true,
      })
      assert.strictEqual(isLowPowerOrSaveData(), false)
    })
  })

  describe('decodeImage & decodedCache', () => {
    it('returns false for empty or invalid URL', async () => {
      const result = await decodeImage('')
      assert.strictEqual(result, false)
      assert.strictEqual(decodedCache.size, 0)
    })

    it('decodes image using img.decode() and caches it', async () => {
      let decodeCalled = 0
      class MockImage {
        src = ''
        async decode() {
          decodeCalled++
          return Promise.resolve()
        }
      }
      globalThis.Image = MockImage as unknown as typeof Image

      const url = 'https://example.com/page-1.jpg'
      const result1 = await decodeImage(url)
      assert.strictEqual(result1, true)
      assert.strictEqual(decodeCalled, 1)
      assert.ok(decodedCache.has(url))

      // Subsequent call hits cache and does NOT call decode again
      const result2 = await decodeImage(url)
      assert.strictEqual(result2, true)
      assert.strictEqual(decodeCalled, 1)
    })

    it('falls back gracefully to onload when decode rejects or is unavailable', async () => {
      class MockImageFallback {
        _src = ''
        onload: (() => void) | null = null
        onerror: (() => void) | null = null

        set src(value: string) {
          this._src = value
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 5)
        }
        get src() {
          return this._src
        }
      }
      globalThis.Image = MockImageFallback as unknown as typeof Image

      const url = 'https://example.com/page-fallback.jpg'
      const result = await decodeImage(url)
      assert.strictEqual(result, true)
      assert.ok(decodedCache.has(url))
    })

    it('returns false if image fails to load or decode', async () => {
      class FailingImage {
        src = ''
        async decode() {
          throw new Error('Corrupt image')
        }
      }
      globalThis.Image = FailingImage as unknown as typeof Image

      const url = 'https://example.com/corrupt.jpg'
      const result = await decodeImage(url)
      assert.strictEqual(result, false)
      assert.ok(!decodedCache.has(url))
    })

    it('deduplicates concurrent in-flight decodeImage calls for the same URL', async () => {
      let decodeStarted = 0
      let resolveDecode!: () => void
      const gate = new Promise<void>((resolve) => {
        resolveDecode = resolve
      })

      class DeferredImage {
        src = ''
        async decode() {
          decodeStarted++
          await gate
        }
      }
      globalThis.Image = DeferredImage as unknown as typeof Image

      const url = 'https://example.com/concurrent.jpg'
      const p1 = decodeImage(url)
      const p2 = decodeImage(`  ${url}  `)
      const p3 = decodeImage(url)

      assert.strictEqual(p1, p2)
      assert.strictEqual(p2, p3)
      assert.strictEqual(decodeStarted, 1)

      resolveDecode()
      const results = await Promise.all([p1, p2, p3])
      assert.deepStrictEqual(results, [true, true, true])
      assert.strictEqual(decodeStarted, 1)
      assert.ok(decodedCache.has(url))
    })

    it('cleans up inFlightDecodes on failure so subsequent retries can succeed', async () => {
      let attempt = 0
      class RetryableImage {
        src = ''
        async decode() {
          attempt++
          if (attempt === 1) {
            throw new Error('Transient error')
          }
        }
      }
      globalThis.Image = RetryableImage as unknown as typeof Image

      const url = 'https://example.com/retry.jpg'
      const [r1, r2] = await Promise.all([decodeImage(url), decodeImage(url)])
      assert.strictEqual(r1, false)
      assert.strictEqual(r2, false)
      assert.strictEqual(attempt, 1)

      const r3 = await decodeImage(url)
      assert.strictEqual(r3, true)
      assert.strictEqual(attempt, 2)
      assert.ok(decodedCache.has(url))
    })

    it('clears inFlightDecodes when clearDecodedCache is called', async () => {
      let decodeStarted = 0
      let resolveFirst!: () => void

      class ControlledImage {
        src = ''
        async decode() {
          decodeStarted++
          if (decodeStarted === 1) {
            await new Promise<void>((resolve) => {
              resolveFirst = resolve
            })
          }
        }
      }
      globalThis.Image = ControlledImage as unknown as typeof Image

      const url = 'https://example.com/reset-inflight.jpg'
      const firstPromise = decodeImage(url)
      assert.strictEqual(decodeStarted, 1)

      clearDecodedCache()

      const secondPromise = decodeImage(url)
      assert.notStrictEqual(firstPromise, secondPromise)
      assert.strictEqual(decodeStarted, 2)

      resolveFirst()
      assert.deepStrictEqual(await Promise.all([firstPromise, secondPromise]), [true, true])
    })
  })

  describe('prefetchSlidingWindow', () => {
    const urls = Array.from({ length: 15 }, (_, i) => `https://example.com/page-${i + 1}.jpg`)

    it('clamps sliding window at the beginning of book (currentPage = 0)', async () => {
      class MockImage {
        src = ''
        async decode() {
          return Promise.resolve()
        }
      }
      globalThis.Image = MockImage as unknown as typeof Image

      // Default ahead: 6, behind: 2
      const prefetched = await prefetchSlidingWindow(urls, 0)
      // indices should be 0 up to 6 (7 pages total)
      assert.strictEqual(prefetched.length, 7)
      assert.strictEqual(prefetched[0], urls[0])
      assert.strictEqual(prefetched[6], urls[6])
      for (const url of prefetched) {
        assert.ok(decodedCache.has(url))
      }
    })

    it('calculates sliding window correctly in middle pages with custom options', async () => {
      class MockImage {
        src = ''
        async decode() {
          return Promise.resolve()
        }
      }
      globalThis.Image = MockImage as unknown as typeof Image

      const currentPage = 5
      const ahead = 3
      const behind = 2
      const prefetched = await prefetchSlidingWindow(urls, currentPage, { ahead, behind })

      // Window should cover indices 5-2=3 to 5+3=8 -> total 6 items (3, 4, 5, 6, 7, 8)
      assert.strictEqual(prefetched.length, 6)
      assert.ok(prefetched.includes(urls[3]))
      assert.ok(prefetched.includes(urls[5]))
      assert.ok(prefetched.includes(urls[8]))
    })

    it('clamps sliding window at the end of book (currentPage = last)', async () => {
      class MockImage {
        src = ''
        async decode() {
          return Promise.resolve()
        }
      }
      globalThis.Image = MockImage as unknown as typeof Image

      const lastIndex = urls.length - 1
      const prefetched = await prefetchSlidingWindow(urls, lastIndex, { ahead: 6, behind: 2 })

      // Indices should be 12, 13, 14 (3 pages total)
      assert.strictEqual(prefetched.length, 3)
      assert.ok(prefetched.includes(urls[lastIndex]))
      assert.ok(prefetched.includes(urls[lastIndex - 2]))
    })

    it('returns empty array when input urls is empty', async () => {
      const prefetched = await prefetchSlidingWindow([], 0)
      assert.deepStrictEqual(prefetched, [])
    })

    it('enforces bounded concurrency (default 2) and preserves priority order', async () => {
      let inFlight = 0
      let maxInFlight = 0
      const decodeOrder: string[] = []

      class ConcurrencyTrackingImage {
        src = ''
        async decode() {
          decodeOrder.push(this.src)
          inFlight++
          maxInFlight = Math.max(maxInFlight, inFlight)
          await new Promise((resolve) => setTimeout(resolve, 10))
          inFlight--
        }
      }
      globalThis.Image = ConcurrencyTrackingImage as unknown as typeof Image

      const prefetched = await prefetchSlidingWindow(urls, 3, { ahead: 3, behind: 2 })

      const expectedPriorityOrder = [
        urls[3],
        urls[4],
        urls[5],
        urls[6],
        urls[2],
        urls[1],
      ]
      assert.deepStrictEqual(prefetched, expectedPriorityOrder)
      assert.deepStrictEqual(decodeOrder, expectedPriorityOrder)
      assert.ok(maxInFlight <= 2, `Expected maxInFlight <= 2, got ${maxInFlight}`)
      assert.strictEqual(maxInFlight, 2)
    })

    it('respects custom concurrency option in prefetchSlidingWindow', async () => {
      let inFlight = 0
      let maxInFlight = 0
      const decodeOrder: string[] = []

      class SerialTrackingImage {
        src = ''
        async decode() {
          decodeOrder.push(this.src)
          inFlight++
          maxInFlight = Math.max(maxInFlight, inFlight)
          await new Promise((resolve) => setTimeout(resolve, 5))
          inFlight--
        }
      }
      globalThis.Image = SerialTrackingImage as unknown as typeof Image

      const prefetched = await prefetchSlidingWindow(urls, 2, {
        ahead: 2,
        behind: 1,
        concurrency: 1,
      })

      const expectedPriorityOrder = [urls[2], urls[3], urls[4], urls[1]]
      assert.deepStrictEqual(prefetched, expectedPriorityOrder)
      assert.deepStrictEqual(decodeOrder, expectedPriorityOrder)
      assert.strictEqual(maxInFlight, 1)
    })
  })

  describe('idlePrefetchAllPages', () => {
    const urls = Array.from({ length: 6 }, (_, i) => `https://example.com/idle-${i + 1}.jpg`)

    it('cancels immediately if low power or saveData is active', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          connection: { saveData: true },
        },
        configurable: true,
        writable: true,
      })

      const cancel = idlePrefetchAllPages(urls, 0)
      cancel()
      assert.strictEqual(decodedCache.size, 0)
    })

    it('allows cancelling idle prefetching before all pages complete', async () => {
      class MockImage {
        src = ''
        async decode() {
          return new Promise(resolve => setTimeout(resolve, 50))
        }
      }
      globalThis.Image = MockImage as unknown as typeof Image

      const cancel = idlePrefetchAllPages(urls, 0)
      // Cancel after 10ms
      await new Promise(resolve => setTimeout(resolve, 10))
      cancel()
      const sizeAfterCancel = decodedCache.size
      // Wait another 120ms and verify no more pages were processed
      await new Promise(resolve => setTimeout(resolve, 120))
      assert.strictEqual(decodedCache.size, sizeAfterCancel)
    })
  })
})
