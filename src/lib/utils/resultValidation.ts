/**
 * Result validation utilities
 * 
 * Provides helper functions to validate Result<T> responses from server actions
 * using Zod schemas for type safety.
 * 
 * Requirements 8.4:
 * - Validate error responses in API calls
 * - Ensure type safety for error handling
 */

import { 
  validateResult, 
  isSuccessResponse, 
  isErrorResponse,
  type Result
} from '@/lib/validators/errorSchemas'
import { z } from 'zod'
import { logger } from '@/lib/services/Logger'
import { safeTypeConversion, isObject } from './asyncPatterns'

/**
 * Validates and handles a Result response from a server action
 * Logs validation errors and provides type-safe access to data or error
 * 
 * @param response - The response from a server action
 * @param dataSchema - Zod schema for the expected data type
 * @param context - Context information for logging
 * @returns Validated result or null if validation fails
 * 
 * @example
 * const result = await validateServerActionResult(
 *   await deleteMagazine(formData),
 *   z.void(),
 *   { operation: 'deleteMagazine', magazineId: id }
 * )
 * 
 * if (result && result.success) {
 *   // Handle success
 * } else if (result && !result.success) {
 *   // Handle error with result.error.userMessage
 * }
 */
export function validateServerActionResult<T extends z.ZodTypeAny>(
  response: unknown,
  dataSchema: T,
  context?: Record<string, unknown>
): z.infer<ReturnType<typeof validateResult<T>>> | null {
  try {
    return validateResult(response, dataSchema)
  } catch (error) {
    logger.error('Failed to validate server action result', {
      operation: 'validateServerActionResult',
      error: error instanceof Error ? error.message : String(error),
      context,
      response
    })
    return null
  }
}

/**
 * Safely handles a Result response with callbacks for success and error cases
 * Validates the response and executes the appropriate callback
 * 
 * @param response - The response from a server action
 * @param dataSchema - Zod schema for the expected data type
 * @param handlers - Success and error callback handlers
 * @param context - Context information for logging
 * 
 * @example
 * await handleServerActionResult(
 *   await deleteMagazine(formData),
 *   z.void(),
 *   {
 *     onSuccess: () => {
 *       toast.success('Dergi başarıyla silindi')
 *       setOpen(false)
 *     },
 *     onError: (error) => {
 *       toast.error(error.userMessage)
 *     }
 *   },
 *   { operation: 'deleteMagazine', magazineId: id }
 * )
 */
export async function handleServerActionResult<T extends z.ZodTypeAny>(
  response: unknown,
  dataSchema: T,
  handlers: {
    onSuccess: (data: z.infer<T>) => void | Promise<void>
    onError: (error: { code: string; message: string; userMessage: string; details?: unknown }) => void | Promise<void>
  },
  context?: Record<string, unknown>
): Promise<void> {
  const result = validateServerActionResult(response, dataSchema, context)
  
  if (!result) {
    // Validation failed, treat as error
    await handlers.onError({
      code: 'VALIDATION_ERROR',
      message: 'Failed to validate server response',
      userMessage: 'Sunucu yanıtı doğrulanamadı. Lütfen tekrar deneyin.'
    })
    return
  }
  
  // Use type guards instead of unsafe type assertions
  const typedResult = safeTypeConversion(result, isObject, 'Result must be an object')
  
  if (isSuccessResponse(typedResult as Result<z.infer<T>>)) {
    const successResult = typedResult as { success: true; data: z.infer<T> }
    await handlers.onSuccess(successResult.data)
  } else if (isErrorResponse(typedResult as Result<z.infer<T>>)) {
    const errorResult = typedResult as { success: false; error: { code: string; message: string; userMessage: string; details?: unknown } }
    await handlers.onError(errorResult.error)
  }
}

/**
 * Extracts data from a Result response, throwing an error if it fails
 * Validates the response and returns the data or throws
 * 
 * @param response - The response from a server action
 * @param dataSchema - Zod schema for the expected data type
 * @param context - Context information for logging
 * @returns The data if successful
 * @throws Error if result is an error or validation fails
 * 
 * @example
 * try {
 *   const path = extractResultData(
 *     await saveUploadLog(issue, content),
 *     z.string(),
 *     { operation: 'saveUploadLog', issue }
 *   )
 *   console.log('Log saved to:', path)
 * } catch (error) {
 *   console.error('Failed to save log:', error)
 * }
 */
export function extractResultData<T extends z.ZodTypeAny>(
  response: unknown,
  dataSchema: T,
  context?: Record<string, unknown>
): z.infer<T> {
  const result = validateServerActionResult(response, dataSchema, context)
  
  if (!result) {
    throw new Error('Failed to validate server response')
  }
  
  // Use type guards instead of unsafe type assertions
  const typedResult = safeTypeConversion(result, isObject, 'Result must be an object')
  
  if (isSuccessResponse(typedResult as Result<z.infer<T>>)) {
    const successResult = typedResult as { success: true; data: z.infer<T> }
    return successResult.data
  } else if (isErrorResponse(typedResult as Result<z.infer<T>>)) {
    const errorResult = typedResult as { success: false; error: { userMessage: string } }
    throw new Error(errorResult.error.userMessage)
  } else {
    throw new Error('Invalid result structure')
  }
}

/**
 * Extracts data from a Result response, returning undefined if it fails
 * Validates the response and returns the data or undefined
 * 
 * @param response - The response from a server action
 * @param dataSchema - Zod schema for the expected data type
 * @param context - Context information for logging
 * @returns The data if successful, undefined otherwise
 * 
 * @example
 * const path = extractResultDataOrUndefined(
 *   await saveUploadLog(issue, content),
 *   z.string(),
 *   { operation: 'saveUploadLog', issue }
 * )
 * 
 * if (path) {
 *   console.log('Log saved to:', path)
 * } else {
 *   console.log('Failed to save log')
 * }
 */
export function extractResultDataOrUndefined<T extends z.ZodTypeAny>(
  response: unknown,
  dataSchema: T,
  context?: Record<string, unknown>
): z.infer<T> | undefined {
  const result = validateServerActionResult(response, dataSchema, context)
  
  if (!result) {
    return undefined
  }
  
  // Use type guards instead of unsafe type assertions
  const typedResult = safeTypeConversion(result, isObject, 'Result must be an object')
  
  if (isSuccessResponse(typedResult as Result<z.infer<T>>)) {
    const successResult = typedResult as { success: true; data: z.infer<T> }
    return successResult.data
  } else {
    return undefined
  }
}

/**
 * Extracts data from a Result response, returning a default value if it fails
 * Validates the response and returns the data or default value
 * 
 * @param response - The response from a server action
 * @param dataSchema - Zod schema for the expected data type
 * @param defaultValue - The default value to return on error
 * @param context - Context information for logging
 * @returns The data if successful, default value otherwise
 * 
 * @example
 * const path = extractResultDataOr(
 *   await saveUploadLog(issue, content),
 *   z.string(),
 *   '/logs/default.txt',
 *   { operation: 'saveUploadLog', issue }
 * )
 */
export function extractResultDataOr<T extends z.ZodTypeAny>(
  response: unknown,
  dataSchema: T,
  defaultValue: z.infer<T>,
  context?: Record<string, unknown>
): z.infer<T> {
  const result = validateServerActionResult(response, dataSchema, context)
  
  if (!result) {
    return defaultValue
  }
  
  // Use type guards instead of unsafe type assertions
  const typedResult = safeTypeConversion(result, isObject, 'Result must be an object')
  
  if (isSuccessResponse(typedResult as Result<z.infer<T>>)) {
    const successResult = typedResult as { success: true; data: z.infer<T> }
    return successResult.data
  } else {
    return defaultValue
  }
}
