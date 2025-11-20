/**
 * Type Guards for Magazine Data
 * 
 * Runtime validation functions to ensure data from external sources
 * (database, API responses) matches expected TypeScript types.
 */

import type { Magazine } from '@/types/magazine'

/**
 * Type guard to check if a value is a valid Magazine object
 * 
 * @param value - The value to check
 * @returns true if value is a valid Magazine
 */
export function isMagazine(value: unknown): value is Magazine {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const obj = value as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.issue_number === 'number' &&
    typeof obj.publication_date === 'string' &&
    typeof obj.is_published === 'boolean' &&
    (obj.cover_image_url === undefined || obj.cover_image_url === null || typeof obj.cover_image_url === 'string') &&
    (obj.pdf_url === undefined || obj.pdf_url === null || typeof obj.pdf_url === 'string') &&
    (obj.page_count === undefined || obj.page_count === null || typeof obj.page_count === 'number') &&
    (obj.created_at === undefined || obj.created_at === null || typeof obj.created_at === 'string') &&
    (obj.updated_at === undefined || obj.updated_at === null || typeof obj.updated_at === 'string')
  )
}

/**
 * Type guard to check if a value is an array of valid Magazine objects
 * 
 * @param value - The value to check
 * @returns true if value is an array of valid Magazines
 */
export function isMagazineArray(value: unknown): value is Magazine[] {
  return Array.isArray(value) && value.every(isMagazine)
}

/**
 * Validates and returns a Magazine object
 * 
 * @param value - The value to validate
 * @returns The validated Magazine object
 * @throws {TypeError} If value is not a valid Magazine
 */
export function assertMagazine(value: unknown): Magazine {
  if (!isMagazine(value)) {
    throw new TypeError('Invalid Magazine object')
  }
  return value
}

/**
 * Validates and returns an array of Magazine objects
 * 
 * @param value - The value to validate
 * @returns The validated Magazine array
 * @throws {TypeError} If value is not a valid Magazine array
 */
export function assertMagazineArray(value: unknown): Magazine[] {
  if (!isMagazineArray(value)) {
    throw new TypeError('Invalid Magazine array')
  }
  return value
}
