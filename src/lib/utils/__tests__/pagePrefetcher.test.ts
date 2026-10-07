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
