import { env } from '@/lib/config/env'

/**
 * Upload Configuration Constants
 * 
 * Defines all configuration values for file uploads, image processing,
 * and PDF conversion to eliminate magic numbers from the codebase.
 */

/**
 * Image processing configuration
 */
export const IMAGE_CONFIG = {
  /** WebP quality for converted images (0.0 - 1.0) */
  WEBP_QUALITY: 0.9,

  /** Default image format for storage */
  FORMAT: 'image/webp' as const,

  /** File extension for converted images */
  EXTENSION: '.webp' as const,
} as const

/**
 * PDF processing configuration
 */
export const PDF_CONFIG = {
  /** 
   * Target height in pixels for PDF page rendering 
   * Increased to 2400 to support high-fidelity zoom on Retina displays
   */
  TARGET_HEIGHT: 2400,

  /** PDF.js worker source URL - uses pre-validated environment variable */
  WORKER_SRC: env.NEXT_PUBLIC_PDFJS_WORKER_URL,

  /** Canvas rendering context type */
  CONTEXT_TYPE: '2d' as const,
} as const

/**
 * Upload limits and constraints
 */
export const UPLOAD_LIMITS = {
  /** Maximum file size for server action uploads (500MB in bytes) */
  MAX_BODY_SIZE: 500 * 1024 * 1024,

  /** Maximum file size for server action uploads (human-readable) */
  MAX_BODY_SIZE_MB: 500,

  /** Maximum number of pages allowed in a PDF */
  MAX_PDF_PAGES: 500,

  /** Maximum individual file size for client uploads (500MB in bytes) */
  MAX_CLIENT_FILE_SIZE: 500 * 1024 * 1024,

  /**
   * Number of concurrent page uploads to process in parallel
   * 
   * This value controls how many pages are uploaded simultaneously during magazine upload.
   * Higher values increase upload speed but may cause:
   * - Increased memory usage
   * - Higher server load
   * - Potential rate limiting issues
   * 
   * Lower values reduce resource usage but increase total upload time.
   * 
   * Recommended values:
   * - 3-5: Balanced performance for most use cases
   * - 5-10: Fast uploads with good connection and server capacity
   * - 1-3: Conservative approach for limited resources
   * 
   * @default 5
   */
  CONCURRENT_UPLOADS: 5,
} as const

/**
 * Combined upload configuration
 */
export const UPLOAD_CONFIG = {
  IMAGE: IMAGE_CONFIG,
  PDF: PDF_CONFIG,
  LIMITS: UPLOAD_LIMITS,
} as const
