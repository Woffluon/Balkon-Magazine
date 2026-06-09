const CACHE_NAME = 'balkon-cache-v1'
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.png',
  '/pdf.worker.min.mjs'
]

const IMAGE_CACHE_NAME = 'balkon-images-cache'
const MAX_IMAGE_CACHE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB limit

// Install event - Cache offline fallback and critical static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets')
      return cache.addAll(STATIC_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// LRU Eviction helper for Image cache
async function limitCacheSize(cacheName, maxBytes) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  
  let currentSize = 0
  const entries = []

  // Gather sizes
  for (const key of keys) {
    const response = await cache.match(key)
    if (response) {
      const contentLength = response.headers.get('content-length')
      const size = contentLength ? parseInt(contentLength, 10) : 0
      entries.push({ key, size, time: new Date(response.headers.get('date') || Date.now()).getTime() })
      currentSize += size
    }
  }

  // Sort by oldest first (LRU)
  entries.sort((a, b) => a.time - b.time)

  // Evict until size is within limit
  while (currentSize > maxBytes && entries.length > 0) {
    const oldest = entries.shift()
    if (oldest) {
      await cache.delete(oldest.key)
      currentSize -= oldest.size
      console.log('[Service Worker] Evicted image cache item due to 50MB limit:', oldest.key.url)
    }
  }
}

// Fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and browser extensions (e.g. chrome-extension://)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return
  }

  // 1. Navigation request (HTML pages) -> Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Keep a copy of page cache for offline reading
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          // Try loading from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Return fallback page if cache is empty
            return caches.match('/offline.html')
          })
        })
    )
    return
  }

  // 2. Images -> Stale-while-revalidate with 50MB limit
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/)) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request)
        
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone())
              // Perform LRU size enforcement asynchronously
              limitCacheSize(IMAGE_CACHE_NAME, MAX_IMAGE_CACHE_SIZE_BYTES)
            }
            return networkResponse
          })
          .catch(() => {
            // Silently swallow network errors, returning cached image if available
          })

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // 3. Static Assets (JS, CSS, Web Workers, Fonts) -> Cache-first
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.includes('/chunks/') ||
    url.pathname.includes('/_next/static/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return networkResponse
        })
      })
    )
    return
  }

  // 4. Default: Network-first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request)
    })
  )
})
