import { z } from 'zod'
import { logger } from '@/lib/services/Logger'

/**
 * Zod schema for validating UploadState from localStorage
 * 
 * Ensures all required fields are present and have correct types.
 * This prevents runtime errors from corrupted or outdated localStorage data.
 * 
 * Satisfies Requirements 7.1, 7.2, 7.3:
 * - Validates parsed JSON against schema
 * - Handles corrupted data gracefully
 * - Handles missing required fields
 */
export const UploadStateSchema = z.object({
  title: z.string(),
  issue: z.number(),
  date: z.string(),
  coverProgress: z.number(),
  pagesProgress: z.number(),
  logs: z.array(z.string()),
  isActive: z.boolean(),
  startTime: z.number(),
})

export type UploadState = z.infer<typeof UploadStateSchema>

/**
 * Generic function to load and validate data from localStorage
 * 
 * This function provides type-safe access to localStorage data by:
 * 1. Loading the raw string from localStorage
 * 2. Parsing the JSON
 * 3. Validating against the provided Zod schema
 * 4. Cleaning up corrupted data automatically
 * 
 * Satisfies Requirements 7.1, 7.2, 7.3, 7.4, 7.5:
 * - Validates localStorage data against schema
 * - Handles corrupted data gracefully and clears it
 * - Returns null for missing fields
 * - Provides type-safe access to validated data
 * - Logs warnings for debugging
 * 
 * @template T - The expected type of the validated data
 * @param key - The localStorage key to load from
 * @param schema - The Zod schema to validate against
 * @returns The validated data, or null if validation fails
 * 
 * @example
 * ```typescript
 * const uploadState = loadValidatedState('upload-state', UploadStateSchema)
 * if (uploadState) {
 *   // uploadState is fully typed and validated
 *   console.log(uploadState.title)
 * }
 * ```
 */
export function loadValidatedState<T>(
  key: string,
  schema: z.ZodSchema<T>
): T | null {
  try {
    // Load raw data from localStorage
    const saved = localStorage.getItem(key)
    if (!saved) {
      return null
    }

    // Parse JSON
    const parsed = JSON.parse(saved)

    // Validate against schema
    const result = schema.safeParse(parsed)

    if (!result.success) {
      // Validation failed - log warning and clear corrupted data
      logger.warn('localStorage validation failed, clearing corrupted data', {
        operation: 'load_validated_state',
        key,
        errors: result.error.issues,
        data: parsed,
      })

      // Clean up corrupted data
      localStorage.removeItem(key)

      return null
    }

    // Return validated data
    return result.data
  } catch (error) {
    // Handle JSON parse errors or localStorage access errors
    logger.warn('Failed to load or parse localStorage data', {
      operation: 'load_validated_state',
      key,
      error: error instanceof Error ? error.message : String(error),
    })

    // Clean up corrupted data
    try {
      localStorage.removeItem(key)
    } catch (cleanupError) {
      // Ignore cleanup errors (e.g., in private browsing mode)
      logger.error('Failed to clean up corrupted localStorage data', {
        operation: 'load_validated_state_cleanup',
        key,
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      })
    }

    return null
  }
}
