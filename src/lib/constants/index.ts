/**
 * Constants Index
 * 
 * Central export point for all application constants.
 * Import from this file to access any constant configuration.
 * 
 * @deprecated Use @/lib/config instead for new code
 * @example
 * ```typescript
 * import { APP_CONFIG } from '@/lib/config'
 * 
 * const quality = APP_CONFIG.upload.image.webpQuality
 * const aspectRatio = APP_CONFIG.magazine.aspectRatio.width
 * ```
 */

// Legacy exports for backward compatibility
export * from './upload'
export * from './storage'
export * from './flipbook'
export * from './server'
export * from './errorMessages'

// New centralized configuration
export { APP_CONFIG } from '@/lib/config'
