import { logger } from '@/lib/services/Logger'

/**
 * Registers the Service Worker for offline support and caching
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.info('Service Worker registered successfully', {
            component: 'register-sw',
            scope: registration.scope,
          })
        })
        .catch((error) => {
          logger.warn('Service Worker registration failed', {
            component: 'register-sw',
            error: error instanceof Error ? error.message : String(error),
          })
        })
    })
  } else {
    logger.debug('Service Worker not supported in this browser', {
      component: 'register-sw',
    })
  }
}
