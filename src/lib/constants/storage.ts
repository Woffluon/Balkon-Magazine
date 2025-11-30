/**
 * Storage Configuration Constants
 * 
 * Defines storage bucket configuration and path generation helpers
 * to centralize storage-related constants and eliminate path duplication.
 */

/**
 * Storage bucket configuration
 */
export const STORAGE_CONFIG = {
  /** Supabase storage bucket name */
  BUCKET: 'magazines' as const,
  
  /** Cache control header for uploaded files */
  CACHE_CONTROL: '3600' as const,
  
  /** Default upsert behavior for uploads */
  DEFAULT_UPSERT: true,
} as const

/**
 * Storage path generation helpers
 * 
 * Provides consistent path generation for all storage operations
 */
export const STORAGE_PATHS = {
  /**
   * Get the cover image path for a magazine issue
   * @param issueNumber - The magazine issue number
   * @returns Path to the cover image
   */
  getCoverPath: (issueNumber: number): string => {
    return `${issueNumber}/cover.webp`
  },
  
  /**
   * Get the path for a specific page in a magazine issue
   * @param issueNumber - The magazine issue number
   * @param pageNumber - The page number (1-indexed)
   * @returns Path to the page image
   */
  getPagePath: (issueNumber: number, pageNumber: number): string => {
    return `${issueNumber}/pages/page-${pageNumber}.webp`
  },
  
  /**
   * Get the directory path for all pages in a magazine issue
   * @param issueNumber - The magazine issue number
   * @returns Path to the pages directory
   */
  getPagesPath: (issueNumber: number): string => {
    return `${issueNumber}/pages`
  },
  
  /**
   * Get the root directory path for a magazine issue
   * @param issueNumber - The magazine issue number
   * @returns Path to the issue root directory
   */
  getIssuePath: (issueNumber: number): string => {
    return `${issueNumber}`
  },
  
  /**
   * Get the path for upload logs
   * @param issueNumber - The magazine issue number
   * @param timestamp - Optional timestamp for the log file
   * @returns Path to the log file
   */
  getLogsPath: (issueNumber: number, timestamp?: string): string => {
    const ts = timestamp || new Date().toISOString().replace(/[:.]/g, '-')
    return `${issueNumber}/logs/upload-${ts}.txt`
  },
} as const
