/**
 * Server Configuration Constants
 * 
 * Defines server-side configuration values including body size limits,
 * timeouts, and other server-specific settings.
 */

/**
 * Server action configuration
 */
export const SERVER_ACTION_CONFIG = {
  /** Maximum body size for server actions (50MB) */
  BODY_SIZE_LIMIT: '50mb' as const,
  
  /** Maximum body size in bytes */
  BODY_SIZE_LIMIT_BYTES: 50 * 1024 * 1024,
  
  /** Request timeout in milliseconds (5 minutes) */
  REQUEST_TIMEOUT: 5 * 60 * 1000,
} as const

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Revalidation time for static pages (seconds) */
  REVALIDATE_TIME: 3600,
  
  /** Cache control header for static assets */
  STATIC_CACHE_CONTROL: 'public, max-age=31536000, immutable' as const,
  
  /** Cache control header for dynamic content */
  DYNAMIC_CACHE_CONTROL: 'public, max-age=3600, must-revalidate' as const,
} as const

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  /** X-Content-Type-Options header */
  CONTENT_TYPE_OPTIONS: 'nosniff' as const,
  
  /** X-Frame-Options header */
  FRAME_OPTIONS: 'DENY' as const,
  
  /** X-XSS-Protection header */
  XSS_PROTECTION: '1; mode=block' as const,
} as const

/**
 * Combined server configuration
 */
export const SERVER_CONFIG = {
  ACTION: SERVER_ACTION_CONFIG,
  CACHE: CACHE_CONFIG,
  SECURITY: SECURITY_HEADERS,
} as const
