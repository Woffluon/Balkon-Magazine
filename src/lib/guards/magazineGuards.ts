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

  const magazineObject = value as Record<string, unknown>

  return (
    typeof magazineObject.id === 'string' &&
    typeof magazineObject.title === 'string' &&
    typeof magazineObject.issue_number === 'number' &&
    typeof magazineObject.publication_date === 'string' &&
    typeof magazineObject.is_published === 'boolean' &&
    (magazineObject.cover_image_url === undefined || magazineObject.cover_image_url === null || typeof magazineObject.cover_image_url === 'string') &&
    (magazineObject.pdf_url === undefined || magazineObject.pdf_url === null || typeof magazineObject.pdf_url === 'string') &&
    (magazineObject.page_count === undefined || magazineObject.page_count === null || typeof magazineObject.page_count === 'number') &&
    (magazineObject.created_at === undefined || magazineObject.created_at === null || typeof magazineObject.created_at === 'string') &&
    (magazineObject.updated_at === undefined || magazineObject.updated_at === null || typeof magazineObject.updated_at === 'string')
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
