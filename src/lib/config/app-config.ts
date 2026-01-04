/**
 * Application Configuration
 * 
 * Centralized configuration system that eliminates magic numbers and provides
 * type-safe access to all application constants. This configuration addresses
 * all hardcoded values identified in the code quality analysis.
 * 
 * @see reports/10-code-quality-maintainability.md
 */

/**
 * Magazine display and flipbook configuration
 */
export const MAGAZINE_CONFIG = {
  /**
   * Aspect ratio configuration for magazine pages
   * Based on A4 portrait proportions scaled for optimal display
   */
  aspectRatio: {
    /** Base width for aspect ratio calculation */
    width: 848,
    /** Base height for aspect ratio calculation */
    height: 1200,
  },

  /**
   * Viewport and display dimensions
   */
  viewport: {
    /** Minimum width for the flipbook viewer (pixels) */
    minWidth: 300,
    /** Maximum width for the flipbook viewer (pixels) */
    maxWidth: 900,
    /** Default width fallback when container width is unavailable (pixels) */
    defaultWidth: 500,
    /** Viewport height multiplier for maximum height calculation */
    heightRatio: 0.85,
    /** Default height fallback (pixels) */
    defaultHeight: 900,
    /** Default loading placeholder height (pixels) */
    loadingHeight: 700,
    /** Padding to maintain around the magazine (pixels) */
    padding: {
      mobile: 16,
      desktop: 32,
    },
  },

  /**
   * Page preloading configuration for performance optimization
   */
  preload: {
    /** Number of pages to preload ahead of current page */
    pagesAhead: 3,
    /** Number of pages to preload behind current page */
    pagesBehind: 1,
    /** Whether to preload the current page */
    preloadCurrent: true,
    /** Whether to preload the previous page */
    preloadPrevious: true,
  },
} as const

/**
 * Upload and file processing configuration
 */
export const UPLOAD_CONFIG = {
  /**
   * PDF processing settings
   */
  pdf: {
    /** Target height in pixels for PDF page rendering (increased to 2400 for Retina support) */
    targetHeight: 2400,
    /** Canvas rendering context type */
    contextType: '2d' as const,
  },

  /**
   * Image processing and conversion settings
   */
  image: {
    /** WebP compression quality (0.0 - 1.0) */
    webpQuality: 0.9,
    /** Default image format for storage */
    format: 'image/webp' as const,
    /** File extension for converted images */
    extension: '.webp' as const,
  },

  /**
   * File upload limits and constraints
   */
  limits: {
    /** Maximum file size for server action uploads (50MB in bytes) */
    maxBodySize: 50 * 1024 * 1024,
    /** Maximum file size for server action uploads (human-readable) */
    maxBodySizeMB: 50,
    /** Maximum number of pages allowed in a PDF */
    maxPdfPages: 500,
    /** Maximum individual file size for client uploads (100MB in bytes) */
    maxClientFileSize: 100 * 1024 * 1024,
    /** Number of concurrent page uploads to process in parallel */
    concurrentUploads: 5,
  },
} as const

/**
 * Storage and file system configuration
 */
export const STORAGE_CONFIG = {
  /**
   * Supabase storage bucket configuration
   */
  bucket: {
    /** Storage bucket name */
    name: 'magazines' as const,
    /** Cache control header for uploaded files (seconds) */
    cacheControlSeconds: 3600,
    /** Default upsert behavior for uploads */
    defaultUpsert: true,
    /** Duplex setting for large file uploads */
    duplex: 'half' as const,
  },

  /**
   * File listing and pagination settings
   */
  listing: {
    /** Maximum files per directory listing operation */
    limit: 1000,
    /** Default limit for storage operations */
    defaultLimit: 100,
  },

  /**
   * File naming conventions and patterns
   */
  fileNaming: {
    /** Prefix for page files */
    pagePrefix: 'sayfa_',
    /** Number of digits for page number padding (e.g., 001, 002) */
    pagePadding: 3,
    /** Filename for cover images */
    coverFilename: 'kapak.webp',
    /** Default file extension for processed images */
    extension: '.webp',
    /** Padding character for file numbering */
    paddingChar: '0',
  },
} as const

/**
 * Error handling and logging configuration
 */
export const SYSTEM_CONFIG = {
  /**
   * Error handling settings
   */
  errors: {
    /** Default error message for unknown errors */
    defaultMessage: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    /** Default error code for unknown errors */
    defaultCode: 'UNKNOWN_ERROR',
    /** Whether to include stack traces in development */
    includeStackTrace: true,
  },

  /**
   * Logging configuration
   */
  logging: {
    /** Whether to enable console logging in development */
    enableConsole: true,
    /** Default log level */
    defaultLevel: 'info' as const,
    /** Whether to include timestamps in logs */
    includeTimestamp: true,
    /** Timezone for log timestamps */
    timezone: 'tr-TR',
  },

  /**
   * Performance and monitoring settings
   */
  performance: {
    /** Maximum function execution time warning threshold (ms) */
    maxExecutionTime: 5000,
    /** Maximum function complexity threshold */
    maxCyclomaticComplexity: 10,
    /** Maximum function length threshold (lines) */
    maxFunctionLength: 50,
  },

  /**
   * Time conversion constants
   */
  time: {
    /** Milliseconds per minute (60 seconds * 1000 milliseconds) */
    millisecondsPerMinute: 60 * 1000,
    /** Milliseconds per second */
    millisecondsPerSecond: 1000,
    /** Seconds per minute */
    secondsPerMinute: 60,
  },
} as const

/**
 * Combined application configuration
 * Provides a single point of access to all configuration values
 */
export const APP_CONFIG = {
  magazine: MAGAZINE_CONFIG,
  upload: UPLOAD_CONFIG,
  storage: STORAGE_CONFIG,
  system: SYSTEM_CONFIG,
} as const

/**
 * Type definitions for configuration objects
 */
export type MagazineConfig = typeof MAGAZINE_CONFIG
export type UploadConfig = typeof UPLOAD_CONFIG
export type StorageConfig = typeof STORAGE_CONFIG
export type SystemConfig = typeof SYSTEM_CONFIG
export type AppConfig = typeof APP_CONFIG

/**
 * Configuration validation helpers
 */
export const CONFIG_VALIDATORS = {
  /**
   * Validates that a number is within the viewport width constraints
   */
  isValidViewportWidth: (width: number): boolean => {
    return width >= MAGAZINE_CONFIG.viewport.minWidth &&
      width <= MAGAZINE_CONFIG.viewport.maxWidth
  },

  /**
   * Validates that a quality value is within acceptable range
   */
  isValidImageQuality: (quality: number): boolean => {
    return quality >= 0 && quality <= 1
  },

  /**
   * Validates that a file size is within upload limits
   */
  isValidFileSize: (size: number): boolean => {
    return size <= UPLOAD_CONFIG.limits.maxClientFileSize
  },

  /**
   * Validates that a page count is within acceptable limits
   */
  isValidPageCount: (count: number): boolean => {
    return count > 0 && count <= UPLOAD_CONFIG.limits.maxPdfPages
  },
} as const

/**
 * Configuration access helpers
 * Provides convenient access to commonly used configuration values
 */
export const CONFIG_HELPERS = {
  /**
   * Get the aspect ratio as a decimal value
   */
  getAspectRatio: (): number => {
    return MAGAZINE_CONFIG.aspectRatio.width / MAGAZINE_CONFIG.aspectRatio.height
  },

  /**
   * Get the maximum viewport height based on window height
   */
  getMaxViewportHeight: (windowHeight: number): number => {
    return Math.floor(windowHeight * MAGAZINE_CONFIG.viewport.heightRatio)
  },

  /**
   * Get the cache control header value
   */
  getCacheControlHeader: (): string => {
    return String(STORAGE_CONFIG.bucket.cacheControlSeconds)
  },

  /**
   * Get formatted page filename with proper padding
   */
  getPageFilename: (pageNumber: number): string => {
    const { pagePrefix, pagePadding, paddingChar, extension } = STORAGE_CONFIG.fileNaming
    return `${pagePrefix}${String(pageNumber).padStart(pagePadding, paddingChar)}${extension}`
  },

  /**
   * Get the preload range for a given current page
   */
  getPreloadRange: (currentPage: number, totalPages: number): number[] => {
    const { pagesAhead, pagesBehind } = MAGAZINE_CONFIG.preload
    const start = Math.max(1, currentPage - pagesBehind)
    const end = Math.min(totalPages, currentPage + pagesAhead)

    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  },
} as const

/**
 * Default export for convenient access
 */
export default APP_CONFIG