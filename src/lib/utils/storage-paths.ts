/**
 * Enhanced Storage Path Utilities
 * 
 * Centralized utilities for constructing storage paths consistently across the application.
 * Uses the centralized configuration system to eliminate hardcoded path patterns.
 * Provides comprehensive validation and type-safe path construction.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.4
 */

import { z } from 'zod'
import { APP_CONFIG } from '@/lib/config/app-config'
// Logger interface for type safety
interface Logger {
  error: (message: string, context?: unknown) => void
  warn: (message: string, context?: unknown) => void
  info: (message: string, context?: unknown) => void
  debug: (message: string, context?: unknown) => void
}

// Conditional logger import to avoid environment validation issues in tests
let logger: Logger
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  logger = require('@/lib/services/Logger').logger as Logger
} catch {
  // Mock logger for testing environment
  logger = {
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
  }
}
import { ValidationError } from '@/lib/errors/AppError'
import { TypeGuards } from '@/lib/guards/runtimeTypeGuards'

/**
 * Input validation schemas for storage path construction
 */
const IssueNumberSchema = z.union([
  z.number().int().positive('Issue number must be positive'),
  z.string().regex(/^\d+$/, 'Issue number string must contain only digits').transform(Number)
])

const PageNumberSchema = z.number().int().positive('Page number must be positive')

const TimestampSchema = z.string().min(1, 'Timestamp cannot be empty').optional()

/**
 * Validates and normalizes an issue number
 */
function validateIssueNumber(issueNumber: number | string, context: string): number {
  try {
    return IssueNumberSchema.parse(issueNumber)
  } catch (error) {
    logger.error('Invalid issue number in storage path construction', {
      operation: 'validate_issue_number',
      context,
      issueNumber,
      error: error instanceof Error ? error.message : String(error)
    })
    
    throw new ValidationError(
      `Invalid issue number: ${issueNumber}`,
      'issueNumber',
      'INVALID_ISSUE_NUMBER',
      'Geçersiz sayı numarası',
      { originalValue: issueNumber, context }
    )
  }
}

/**
 * Validates a page number
 */
function validatePageNumber(pageNumber: number, context: string): number {
  try {
    return PageNumberSchema.parse(pageNumber)
  } catch (error) {
    logger.error('Invalid page number in storage path construction', {
      operation: 'validate_page_number',
      context,
      pageNumber,
      error: error instanceof Error ? error.message : String(error)
    })
    
    throw new ValidationError(
      `Invalid page number: ${pageNumber}`,
      'pageNumber',
      'INVALID_PAGE_NUMBER',
      'Geçersiz sayfa numarası',
      { originalValue: pageNumber, context }
    )
  }
}

/**
 * Enhanced storage path construction utilities
 * Provides consistent path generation for all storage operations with validation
 */
export const StoragePaths = {
  /**
   * Get the root directory path for a magazine issue
   * @param issueNumber - The magazine issue number
   * @returns Path to the issue root directory
   */
  magazineFolder: (issueNumber: number | string): string => {
    const validatedIssue = validateIssueNumber(issueNumber, 'magazineFolder')
    return String(validatedIssue)
  },
  
  /**
   * Get the directory path for all pages in a magazine issue
   * @param issueNumber - The magazine issue number
   * @returns Path to the pages directory
   */
  pagesFolder: (issueNumber: number | string): string => {
    const validatedIssue = validateIssueNumber(issueNumber, 'pagesFolder')
    return `${validatedIssue}/pages`
  },
  
  /**
   * Get the path for a specific page in a magazine issue
   * @param issueNumber - The magazine issue number
   * @param pageNumber - The page number (1-indexed)
   * @returns Path to the page image
   */
  pagePath: (issueNumber: number | string, pageNumber: number): string => {
    const validatedIssue = validateIssueNumber(issueNumber, 'pagePath')
    const validatedPage = validatePageNumber(pageNumber, 'pagePath')
    
    const { pagePrefix, pagePadding, paddingChar, extension } = APP_CONFIG.storage.fileNaming
    const paddedPageNumber = String(validatedPage).padStart(pagePadding, paddingChar)
    return `${validatedIssue}/pages/${pagePrefix}${paddedPageNumber}${extension}`
  },
  
  /**
   * Get the cover image path for a magazine issue
   * @param issueNumber - The magazine issue number
   * @returns Path to the cover image
   */
  coverPath: (issueNumber: number | string): string => {
    const validatedIssue = validateIssueNumber(issueNumber, 'coverPath')
    const { coverFilename } = APP_CONFIG.storage.fileNaming
    return `${validatedIssue}/${coverFilename}`
  },
  
  /**
   * Get the directory path for logs in a magazine issue
   * @param issueNumber - The magazine issue number
   * @returns Path to the logs directory
   */
  logsFolder: (issueNumber: number | string): string => {
    const validatedIssue = validateIssueNumber(issueNumber, 'logsFolder')
    return `${validatedIssue}/logs`
  },
  
  /**
   * Get the path for upload logs
   * @param issueNumber - The magazine issue number
   * @param timestamp - Optional timestamp for the log file
   * @returns Path to the log file
   */
  logPath: (issueNumber: number | string, timestamp?: string): string => {
    const validatedIssue = validateIssueNumber(issueNumber, 'logPath')
    
    let validatedTimestamp: string
    if (timestamp) {
      try {
        validatedTimestamp = TimestampSchema.parse(timestamp) || new Date().toISOString().replace(/[:.]/g, '-')
      } catch {
        logger.warn('Invalid timestamp provided, using current time', {
          operation: 'log_path',
          providedTimestamp: timestamp
        })
        validatedTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
      }
    } else {
      validatedTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
    }
    
    return `${validatedIssue}/logs/upload-${validatedTimestamp}.txt`
  },
  
  /**
   * Get all possible paths for a magazine issue (for cleanup operations)
   * @param issueNumber - The magazine issue number
   * @returns Array of all paths associated with the issue
   */
  getAllPaths: (issueNumber: number | string): string[] => {
    const validatedIssue = validateIssueNumber(issueNumber, 'getAllPaths')
    return [
      StoragePaths.magazineFolder(validatedIssue),
      StoragePaths.pagesFolder(validatedIssue),
      StoragePaths.coverPath(validatedIssue),
      StoragePaths.logsFolder(validatedIssue),
    ]
  },
  
  /**
   * Safely construct a path with validation and error handling
   * @param pathType - The type of path to construct
   * @param params - Parameters for path construction
   * @returns The constructed path or throws ValidationError
   */
  safePath: (
    pathType: 'magazine' | 'pages' | 'page' | 'cover' | 'logs' | 'log',
    params: { issueNumber: number | string; pageNumber?: number; timestamp?: string }
  ): string => {
    try {
      switch (pathType) {
        case 'magazine':
          return StoragePaths.magazineFolder(params.issueNumber)
        case 'pages':
          return StoragePaths.pagesFolder(params.issueNumber)
        case 'page':
          if (params.pageNumber === undefined) {
            throw new ValidationError(
              'Page number is required for page path',
              'pageNumber',
              'MISSING_PAGE_NUMBER',
              'Sayfa numarası gereklidir'
            )
          }
          return StoragePaths.pagePath(params.issueNumber, params.pageNumber)
        case 'cover':
          return StoragePaths.coverPath(params.issueNumber)
        case 'logs':
          return StoragePaths.logsFolder(params.issueNumber)
        case 'log':
          return StoragePaths.logPath(params.issueNumber, params.timestamp)
        default:
          throw new ValidationError(
            `Unknown path type: ${pathType}`,
            'pathType',
            'UNKNOWN_PATH_TYPE',
            'Bilinmeyen yol türü'
          )
      }
    } catch (error) {
      logger.error('Failed to construct storage path', {
        operation: 'safe_path',
        pathType,
        params,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  },
} as const

/**
 * Enhanced path validation utilities with comprehensive security checks
 */
export const PathValidators = {
  /**
   * Validates that a path follows the expected magazine structure
   * @param path - The path to validate
   * @returns True if the path is valid
   */
  isValidMagazinePath: (path: string): boolean => {
    if (!TypeGuards.isNonEmptyString(path)) return false
    
    // Check for path traversal attempts
    if (path.includes('..') || path.includes('//') || path.startsWith('/')) {
      logger.warn('Potential path traversal attempt detected', {
        operation: 'validate_magazine_path',
        path,
        reason: 'path_traversal'
      })
      return false
    }
    
    const pathPattern = /^\d+\/(pages\/sayfa_\d{3}\.webp|kapak\.webp|logs\/upload-.+\.txt)$/
    return pathPattern.test(path)
  },
  
  /**
   * Validates that a page path follows the expected format
   * @param path - The page path to validate
   * @returns True if the page path is valid
   */
  isValidPagePath: (path: string): boolean => {
    if (!TypeGuards.isNonEmptyString(path)) return false
    
    // Security check
    if (path.includes('..') || path.includes('//')) return false
    
    const pagePattern = /^\d+\/pages\/sayfa_\d{3}\.webp$/
    return pagePattern.test(path)
  },
  
  /**
   * Validates that a cover path follows the expected format
   * @param path - The cover path to validate
   * @returns True if the cover path is valid
   */
  isValidCoverPath: (path: string): boolean => {
    if (!TypeGuards.isNonEmptyString(path)) return false
    
    // Security check
    if (path.includes('..') || path.includes('//')) return false
    
    const coverPattern = /^\d+\/kapak\.webp$/
    return coverPattern.test(path)
  },
  
  /**
   * Validates that a logs path follows the expected format
   * @param path - The logs path to validate
   * @returns True if the logs path is valid
   */
  isValidLogsPath: (path: string): boolean => {
    if (!TypeGuards.isNonEmptyString(path)) return false
    
    // Security check
    if (path.includes('..') || path.includes('//')) return false
    
    const logsPattern = /^\d+\/logs\/upload-.+\.txt$/
    return logsPattern.test(path)
  },
  
  /**
   * Validates that a path is safe (no path traversal attempts)
   * @param path - The path to validate
   * @returns True if the path is safe
   */
  isSafePath: (path: string): boolean => {
    if (!TypeGuards.isNonEmptyString(path)) return false
    
    // Check for various path traversal patterns
    const dangerousPatterns = [
      '..',      // Parent directory
      '//',      // Double slash
      '\\',      // Backslash (Windows path separator)
      '\0',      // Null byte
      '%2e%2e',  // URL encoded ..
      '%2f',     // URL encoded /
      '%5c',     // URL encoded \
    ]
    
    const lowerPath = path.toLowerCase()
    return !dangerousPatterns.some(pattern => lowerPath.includes(pattern))
  },
  
  /**
   * Validates and sanitizes a path
   * @param path - The path to validate and sanitize
   * @returns The sanitized path or null if invalid
   */
  sanitizePath: (path: string): string | null => {
    if (!TypeGuards.isNonEmptyString(path)) return null
    
    // Remove dangerous characters and patterns
    let sanitized = path
      .replace(/\.\./g, '')  // Remove ..
      .replace(/\/+/g, '/')  // Replace multiple slashes with single
      .replace(/\\/g, '/')   // Replace backslashes with forward slashes
      .replace(/\0/g, '')    // Remove null bytes
    
    // Remove leading slash
    sanitized = sanitized.replace(/^\/+/, '')
    
    // Validate the sanitized path
    if (!PathValidators.isSafePath(sanitized)) {
      return null
    }
    
    return sanitized
  },
} as const

/**
 * Path parsing utilities
 */
export const PathParsers = {
  /**
   * Extract issue number from a storage path
   * @param path - The storage path
   * @returns The issue number or null if not found
   */
  extractIssueNumber: (path: string): number | null => {
    const match = path.match(/^(\d+)\//)
    return match ? parseInt(match[1], 10) : null
  },
  
  /**
   * Extract page number from a page path
   * @param path - The page path
   * @returns The page number or null if not found
   */
  extractPageNumber: (path: string): number | null => {
    const match = path.match(/\/sayfa_(\d{3})\.webp$/)
    return match ? parseInt(match[1], 10) : null
  },
  
  /**
   * Check if a path is a page path
   * @param path - The path to check
   * @returns True if the path is a page path
   */
  isPagePath: (path: string): boolean => {
    return path.includes('/pages/sayfa_') && path.endsWith('.webp')
  },
  
  /**
   * Check if a path is a cover path
   * @param path - The path to check
   * @returns True if the path is a cover path
   */
  isCoverPath: (path: string): boolean => {
    return path.endsWith('/kapak.webp')
  },
} as const

/**
 * Default export for convenience
 */
export default StoragePaths