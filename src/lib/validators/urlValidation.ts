import { z } from 'zod'

/**
 * Schema for validating page numbers from URL parameters
 * Ensures the value is a positive integer
 */
export const PageNumberSchema = z.coerce
  .number()
  .int('Sayfa numarası tam sayı olmalı')
  .positive('Sayfa numarası pozitif olmalı')

/**
 * Validates a URL parameter as a page number
 * @param param - The URL parameter string to validate
 * @returns The validated number or null if invalid
 */
export function validatePageNumber(param: string): number | null {
  const result = PageNumberSchema.safeParse(param)
  return result.success ? result.data : null
}

/**
 * URL validation schema
 * Validates URL format and rejects invalid URLs
 * 
 * Requirements:
 * - 2.2: Validate URL format and reject invalid URLs
 */
export const URLSchema = z.string().url('Geçersiz URL formatı')

/**
 * Optional URL validation schema
 * Allows empty strings or valid URLs
 * 
 * Requirements:
 * - 2.2: Validate URL format and reject invalid URLs
 */
export const OptionalURLSchema = z.string().url('Geçersiz URL formatı').optional().or(z.literal(''))

/**
 * Validates a string as a URL
 * @param url - The URL string to validate
 * @returns True if valid, false otherwise
 */
export function isValidURL(url: string): boolean {
  const result = URLSchema.safeParse(url)
  return result.success
}

/**
 * Validates an optional URL (can be empty or valid URL)
 * @param url - The URL string to validate
 * @returns True if valid or empty, false otherwise
 */
export function isValidOptionalURL(url: string | undefined): boolean {
  if (!url || url === '') return true
  return isValidURL(url)
}

/**
 * Validates and returns a URL or throws an error
 * @param url - The URL string to validate
 * @returns The validated URL
 * @throws Error if URL is invalid
 */
export function validateURL(url: string): string {
  const result = URLSchema.safeParse(url)
  if (!result.success) {
    throw new Error('Geçersiz URL formatı')
  }
  return result.data
}