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
  /** Target height in pixels for PDF page rendering */
  TARGET_HEIGHT: 1200,
  
  /** PDF.js worker source URL - uses local worker from node_modules */
  WORKER_SRC: '/pdf.worker.min.mjs' as const,
  
  /** Canvas rendering context type */
  CONTEXT_TYPE: '2d' as const,
} as const

/**
 * Upload limits and constraints
 */
export const UPLOAD_LIMITS = {
  /** Maximum file size for server action uploads (50MB in bytes) */
  MAX_BODY_SIZE: 50 * 1024 * 1024,
  
  /** Maximum file size for server action uploads (human-readable) */
  MAX_BODY_SIZE_MB: 50,
  
  /** Maximum number of pages allowed in a PDF */
  MAX_PDF_PAGES: 500,
  
  /** Maximum individual file size for client uploads (100MB in bytes) */
  MAX_CLIENT_FILE_SIZE: 100 * 1024 * 1024,
} as const

/**
 * Combined upload configuration
 */
export const UPLOAD_CONFIG = {
  IMAGE: IMAGE_CONFIG,
  PDF: PDF_CONFIG,
  LIMITS: UPLOAD_LIMITS,
} as const
