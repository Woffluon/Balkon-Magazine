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