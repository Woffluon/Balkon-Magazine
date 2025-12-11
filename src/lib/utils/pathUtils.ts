/**
 * Standardized File Path Utilities
 * 
 * Provides centralized utility functions for consistent file path construction,
 * validation, and manipulation across the application.
 * 
 * Requirements 7.4:
 * - Centralized utility functions for file paths
 * - Consistent path construction patterns
 */

import { APP_CONFIG } from '@/lib/config/app-config'
import { AppError } from '@/lib/errors/AppError'
import { isString, isNumber } from './asyncPatterns'

/**
 * Path validation options
 */
export interface PathValidationOptions {
  allowEmpty?: boolean
  maxLength?: number
  allowedExtensions?: string[]
  requireExtension?: boolean
}

/**
 * File path components for magazine storage
 */
export interface MagazinePathComponents {
  issueNumber: number
  pageNumber?: number
  fileName?: string
  extension?: string
}

/**
 * Validates a file path string
 * 
 * Performs comprehensive validation of file paths including
 * length checks, character validation, and extension validation.
 * 
 * @param path - The file path to validate
 * @param options - Validation options
 * @returns True if path is valid
 * @throws AppError if path is invalid
 * 
 * @example
 * ```typescript
 * validatePath('magazines/1/pages/page001.webp', {
 *   maxLength: 255,
 *   allowedExtensions: ['.webp', '.jpg', '.png'],
 *   requireExtension: true
 * })
 * ```
 */
export function validatePath(
  path: string,
  options: PathValidationOptions = {}
): boolean {
  const {
    allowEmpty = false,
    maxLength = 255,
    allowedExtensions = [],
    requireExtension = false
  } = options
  
  // Check if path is empty
  if (!path || path.trim().length === 0) {
    if (allowEmpty) {
      return true
    }
    throw new AppError(
      'Path cannot be empty',
      'INVALID_PATH',
      400,
      'Dosya yolu boş olamaz.',
      false,
      { path }
    )
  }
  
  // Check path length
  if (path.length > maxLength) {
    throw new AppError(
      `Path exceeds maximum length of ${maxLength} characters`,
      'PATH_TOO_LONG',
      400,
      'Dosya yolu çok uzun.',
      false,
      { path, maxLength, actualLength: path.length }
    )
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"|?*\x00-\x1f]/
  if (invalidChars.test(path)) {
    throw new AppError(
      'Path contains invalid characters',
      'INVALID_PATH_CHARACTERS',
      400,
      'Dosya yolu geçersiz karakterler içeriyor.',
      false,
      { path }
    )
  }
  
  // Check for path traversal attempts
  if (path.includes('..') || path.includes('./') || path.includes('.\\')) {
    throw new AppError(
      'Path contains path traversal sequences',
      'PATH_TRAVERSAL_ATTEMPT',
      400,
      'Dosya yolu güvenlik riski içeriyor.',
      false,
      { path }
    )
  }
  
  // Check extension requirements
  if (requireExtension || allowedExtensions.length > 0) {
    const extension = getFileExtension(path)
    
    if (requireExtension && !extension) {
      throw new AppError(
        'Path must have a file extension',
        'MISSING_FILE_EXTENSION',
        400,
        'Dosya uzantısı gerekli.',
        false,
        { path }
      )
    }
    
    if (allowedExtensions.length > 0 && extension && !allowedExtensions.includes(extension)) {
      throw new AppError(
        `File extension '${extension}' is not allowed`,
        'INVALID_FILE_EXTENSION',
        400,
        'Dosya uzantısı desteklenmiyor.',
        false,
        { path, extension, allowedExtensions }
      )
    }
  }
  
  return true
}

/**
 * Extracts file extension from a path
 * 
 * @param path - The file path
 * @returns File extension including the dot, or empty string if no extension
 * 
 * @example
 * ```typescript
 * getFileExtension('image.webp') // '.webp'
 * getFileExtension('document') // ''
 * getFileExtension('archive.tar.gz') // '.gz'
 * ```
 */
export function getFileExtension(path: string): string {
  if (!isString(path) || path.trim().length === 0) {
    return ''
  }
  
  const lastDotIndex = path.lastIndexOf('.')
  const lastSlashIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  
  // Extension must be after the last directory separator
  if (lastDotIndex > lastSlashIndex && lastDotIndex < path.length - 1) {
    return path.substring(lastDotIndex)
  }
  
  return ''
}

/**
 * Extracts filename from a path (without directory)
 * 
 * @param path - The file path
 * @returns Filename without directory path
 * 
 * @example
 * ```typescript
 * getFileName('magazines/1/cover.webp') // 'cover.webp'
 * getFileName('document.pdf') // 'document.pdf'
 * ```
 */
export function getFileName(path: string): string {
  if (!isString(path) || path.trim().length === 0) {
    return ''
  }
  
  const lastSlashIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return path.substring(lastSlashIndex + 1)
}

/**
 * Extracts directory path from a file path
 * 
 * @param path - The file path
 * @returns Directory path without filename
 * 
 * @example
 * ```typescript
 * getDirectoryPath('magazines/1/cover.webp') // 'magazines/1'
 * getDirectoryPath('document.pdf') // ''
 * ```
 */
export function getDirectoryPath(path: string): string {
  if (!isString(path) || path.trim().length === 0) {
    return ''
  }
  
  const lastSlashIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return lastSlashIndex > 0 ? path.substring(0, lastSlashIndex) : ''
}

/**
 * Joins path segments with proper separators
 * 
 * Joins multiple path segments with forward slashes, handling
 * edge cases like empty segments and duplicate separators.
 * 
 * @param segments - Path segments to join
 * @returns Joined path string
 * 
 * @example
 * ```typescript
 * joinPath('magazines', '1', 'pages', 'page001.webp')
 * // 'magazines/1/pages/page001.webp'
 * 
 * joinPath('', 'magazines/', '/1/', 'cover.webp')
 * // 'magazines/1/cover.webp'
 * ```
 */
export function joinPath(...segments: (string | number)[]): string {
  return segments
    .map(segment => String(segment))
    .filter(segment => segment.length > 0)
    .map(segment => segment.replace(/^\/+|\/+$/g, '')) // Remove leading/trailing slashes
    .filter(segment => segment.length > 0)
    .join('/')
}

/**
 * Normalizes a path by removing redundant separators and segments
 * 
 * @param path - The path to normalize
 * @returns Normalized path string
 * 
 * @example
 * ```typescript
 * normalizePath('magazines//1///pages/./page001.webp')
 * // 'magazines/1/pages/page001.webp'
 * ```
 */
export function normalizePath(path: string): string {
  if (!isString(path)) {
    return ''
  }
  
  return path
    .replace(/\/+/g, '/') // Replace multiple slashes with single slash
    .replace(/\/\.\//g, '/') // Remove /./ segments
    .replace(/^\.\//, '') // Remove leading ./
    .replace(/\/$/, '') // Remove trailing slash
}

/**
 * Creates a magazine folder path
 * 
 * @param issueNumber - Magazine issue number
 * @returns Magazine folder path
 * 
 * @example
 * ```typescript
 * createMagazineFolderPath(1) // '1'
 * createMagazineFolderPath(42) // '42'
 * ```
 */
export function createMagazineFolderPath(issueNumber: number | string): string {
  const issue = isNumber(issueNumber) ? issueNumber : parseInt(String(issueNumber), 10)
  
  if (!isNumber(issue) || issue < 1) {
    throw new AppError(
      'Issue number must be a positive integer',
      'INVALID_ISSUE_NUMBER',
      400,
      'Sayı numarası pozitif bir tam sayı olmalıdır.',
      false,
      { issueNumber }
    )
  }
  
  return String(issue)
}

/**
 * Creates a magazine pages folder path
 * 
 * @param issueNumber - Magazine issue number
 * @returns Pages folder path
 * 
 * @example
 * ```typescript
 * createPagesFolderPath(1) // '1/pages'
 * ```
 */
export function createPagesFolderPath(issueNumber: number | string): string {
  const magazinePath = createMagazineFolderPath(issueNumber)
  return joinPath(magazinePath, 'pages')
}

/**
 * Creates a magazine page file path
 * 
 * @param issueNumber - Magazine issue number
 * @param pageNumber - Page number
 * @returns Page file path
 * 
 * @example
 * ```typescript
 * createPageFilePath(1, 5) // '1/pages/page005.webp'
 * ```
 */
export function createPageFilePath(issueNumber: number | string, pageNumber: number): string {
  if (!isNumber(pageNumber) || pageNumber < 1) {
    throw new AppError(
      'Page number must be a positive integer',
      'INVALID_PAGE_NUMBER',
      400,
      'Sayfa numarası pozitif bir tam sayı olmalıdır.',
      false,
      { pageNumber }
    )
  }
  
  const pagesPath = createPagesFolderPath(issueNumber)
  const { pagePrefix, pagePadding, extension } = APP_CONFIG.storage.fileNaming
  const paddedPageNumber = String(pageNumber).padStart(pagePadding, '0')
  const fileName = `${pagePrefix}${paddedPageNumber}${extension}`
  
  return joinPath(pagesPath, fileName)
}

/**
 * Creates a magazine cover file path
 * 
 * @param issueNumber - Magazine issue number
 * @returns Cover file path
 * 
 * @example
 * ```typescript
 * createCoverFilePath(1) // '1/cover.webp'
 * ```
 */
export function createCoverFilePath(issueNumber: number | string): string {
  const magazinePath = createMagazineFolderPath(issueNumber)
  const { coverFilename } = APP_CONFIG.storage.fileNaming
  
  return joinPath(magazinePath, coverFilename)
}

/**
 * Creates a magazine logs folder path
 * 
 * @param issueNumber - Magazine issue number
 * @returns Logs folder path
 * 
 * @example
 * ```typescript
 * createLogsFolderPath(1) // '1/logs'
 * ```
 */
export function createLogsFolderPath(issueNumber: number | string): string {
  const magazinePath = createMagazineFolderPath(issueNumber)
  return joinPath(magazinePath, 'logs')
}

/**
 * Creates a magazine log file path
 * 
 * @param issueNumber - Magazine issue number
 * @param timestamp - Timestamp for the log file
 * @returns Log file path
 * 
 * @example
 * ```typescript
 * createLogFilePath(1, '2024-01-01T12-00-00-000Z') 
 * // '1/logs/upload-2024-01-01T12-00-00-000Z.txt'
 * ```
 */
export function createLogFilePath(issueNumber: number | string, timestamp: string): string {
  if (!isString(timestamp) || timestamp.trim().length === 0) {
    throw new AppError(
      'Timestamp must be a non-empty string',
      'INVALID_TIMESTAMP',
      400,
      'Zaman damgası geçersiz.',
      false,
      { timestamp }
    )
  }
  
  const logsPath = createLogsFolderPath(issueNumber)
  const fileName = `upload-${timestamp}.txt`
  
  return joinPath(logsPath, fileName)
}

/**
 * Parses a magazine path to extract components
 * 
 * @param path - The magazine file path to parse
 * @returns Parsed path components
 * @throws AppError if path format is invalid
 * 
 * @example
 * ```typescript
 * parseMagazinePath('1/pages/page005.webp')
 * // { issueNumber: 1, pageNumber: 5, fileName: 'page005.webp', extension: '.webp' }
 * 
 * parseMagazinePath('42/cover.webp')
 * // { issueNumber: 42, fileName: 'cover.webp', extension: '.webp' }
 * ```
 */
export function parseMagazinePath(path: string): MagazinePathComponents {
  if (!isString(path) || path.trim().length === 0) {
    throw new AppError(
      'Path cannot be empty',
      'INVALID_PATH',
      400,
      'Dosya yolu boş olamaz.',
      false,
      { path }
    )
  }
  
  const normalizedPath = normalizePath(path)
  const segments = normalizedPath.split('/')
  
  if (segments.length < 2) {
    throw new AppError(
      'Invalid magazine path format',
      'INVALID_PATH_FORMAT',
      400,
      'Geçersiz dergi dosya yolu formatı.',
      false,
      { path }
    )
  }
  
  // Extract issue number
  const issueNumber = parseInt(segments[0], 10)
  if (!isNumber(issueNumber) || issueNumber < 1) {
    throw new AppError(
      'Invalid issue number in path',
      'INVALID_ISSUE_NUMBER_IN_PATH',
      400,
      'Dosya yolunda geçersiz sayı numarası.',
      false,
      { path, issueSegment: segments[0] }
    )
  }
  
  const fileName = segments[segments.length - 1]
  const extension = getFileExtension(fileName)
  
  const result: MagazinePathComponents = {
    issueNumber,
    fileName,
    extension: extension || undefined
  }
  
  // Check if this is a page path
  if (segments.length >= 3 && segments[1] === 'pages') {
    const { pagePrefix } = APP_CONFIG.storage.fileNaming
    
    // Extract page number from filename
    if (fileName.startsWith(pagePrefix)) {
      const pageNumberStr = fileName
        .substring(pagePrefix.length)
        .replace(extension, '')
      
      const pageNumber = parseInt(pageNumberStr, 10)
      if (isNumber(pageNumber) && pageNumber > 0) {
        result.pageNumber = pageNumber
      }
    }
  }
  
  return result
}

/**
 * Checks if a path is a valid magazine path
 * 
 * @param path - The path to validate
 * @returns True if path is a valid magazine path
 * 
 * @example
 * ```typescript
 * isValidMagazinePath('1/pages/page001.webp') // true
 * isValidMagazinePath('1/cover.webp') // true
 * isValidMagazinePath('invalid/path') // false
 * ```
 */
export function isValidMagazinePath(path: string): boolean {
  try {
    parseMagazinePath(path)
    return true
  } catch {
    return false
  }
}

/**
 * Creates a safe filename by removing or replacing invalid characters
 * 
 * @param filename - The original filename
 * @param replacement - Character to replace invalid characters with
 * @returns Safe filename
 * 
 * @example
 * ```typescript
 * createSafeFilename('My Document: Version 2.0.pdf') 
 * // 'My Document- Version 2.0.pdf'
 * 
 * createSafeFilename('file<>name.txt', '_')
 * // 'file__name.txt'
 * ```
 */
export function createSafeFilename(filename: string, replacement: string = '-'): string {
  if (!isString(filename)) {
    return ''
  }
  
  return filename
    .replace(/[<>:"|?*\x00-\x1f]/g, replacement) // Replace invalid characters
    .replace(/\.+$/, '') // Remove trailing dots
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}