/**
 * Type Guards for Storage Data
 * 
 * Runtime validation functions to ensure data from storage operations
 * matches expected TypeScript types.
 */

import type { StorageFile } from '@/types/storage'

/**
 * Type guard to check if a value is a valid StorageFile object
 * 
 * @param value - The value to check
 * @returns true if value is a valid StorageFile
 */
export function isStorageFile(value: unknown): value is StorageFile {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const storageObject = value as Record<string, unknown>

  return (
    typeof storageObject.name === 'string' &&
    (storageObject.id === null || typeof storageObject.id === 'string') &&
    typeof storageObject.path === 'string'
  )
}

/**
 * Type guard to check if a value is an array of valid StorageFile objects
 * 
 * @param value - The value to check
 * @returns true if value is an array of valid StorageFiles
 */
export function isStorageFileArray(value: unknown): value is StorageFile[] {
  return Array.isArray(value) && value.every(isStorageFile)
}

/**
 * Validates and returns a StorageFile object
 * 
 * @param value - The value to validate
 * @returns The validated StorageFile object
 * @throws {TypeError} If value is not a valid StorageFile
 */
export function assertStorageFile(value: unknown): StorageFile {
  if (!isStorageFile(value)) {
    throw new TypeError('Invalid StorageFile object')
  }
  return value
}

/**
 * Validates and returns an array of StorageFile objects
 * 
 * @param value - The value to validate
 * @returns The validated StorageFile array
 * @throws {TypeError} If value is not a valid StorageFile array
 */
export function assertStorageFileArray(value: unknown): StorageFile[] {
  if (!isStorageFileArray(value)) {
    throw new TypeError('Invalid StorageFile array')
  }
  return value
}
