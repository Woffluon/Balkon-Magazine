/**
 * Error Message Utilities
 * 
 * Implements Requirements 7.1, 7.2, 7.4:
 * - Descriptive error messages in Turkish
 * - Validation error listing with field names
 * - Error context formatting
 * 
 * @module errorMessages
 */

import { ZodError } from 'zod'
import { DatabaseApiError, ErrorType } from '@/lib/errors/DatabaseApiError'
import { AppError } from '@/lib/errors/AppError'

/**
 * Formatted error information for display
 */
export interface FormattedError {
  /** User-friendly error message in Turkish */
  message: string
  /** Error type classification */
  type: string
  /** Detailed field-level errors (for validation) */
  fields?: Array<{ field: string; message: string }>
  /** Additional context information */
  context?: Record<string, unknown>
  /** Whether the operation can be retried */
  retryable: boolean
}

/**
 * Gets a user-friendly error message from any error type
 * 
 * Implements Requirement 7.1: Descriptive error messages in Turkish
 * 
 * @param error - Any error object
 * @returns User-friendly Turkish error message
 * 
 * @example
 * ```typescript
 * try {
 *   await operation()
 * } catch (error) {
 *   const message = getUserFriendlyError(error)
 *   toast.error(message)
 * }
 * ```
 */
export function getUserFriendlyError(error: unknown): string {
  // DatabaseApiError - use built-in user message
  if (error instanceof DatabaseApiError) {
    return error.getUserMessage()
  }
  
  // AppError - use userMessage field
  if (error instanceof AppError) {
    return error.userMessage
  }
  
  // Zod validation error - format validation errors
  if (error instanceof ZodError) {
    const fieldErrors = error.issues.map(zodIssue => {
      const fieldPath = zodIssue.path.map(String).join('.')
      return `${fieldPath}: ${zodIssue.message}`
    })
    
    if (fieldErrors.length === 1) {
      return `Doğrulama hatası: ${fieldErrors[0]}`
    }
    
    return `Doğrulama hataları:\n${fieldErrors.join('\n')}`
  }
  
  // Standard Error - use message
  if (error instanceof Error) {
    // Check for common error patterns and provide Turkish messages
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.'
    }
    
    if (message.includes('timeout')) {
      return 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.'
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'Bu işlem için yetkiniz bulunmuyor.'
    }
    
    if (message.includes('not found')) {
      return 'İstenen kayıt bulunamadı.'
    }
    
    // Return original message if no pattern matches
    return error.message
  }
  
  // Unknown error type
  return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
}

/**
 * Formats validation errors with field names and constraints
 * 
 * Implements Requirement 7.2: Validation error listing
 * 
 * @param error - Zod validation error
 * @returns Array of formatted field errors
 * 
 * @example
 * ```typescript
 * try {
 *   schema.parse(data)
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     const fieldErrors = formatValidationErrors(error)
 *     fieldErrors.forEach(({ field, message }) => {
 *       console.log(`${field}: ${message}`)
 *     })
 *   }
 * }
 * ```
 */
export function formatValidationErrors(
  error: ZodError
): Array<{ field: string; message: string }> {
  return error.issues.map(zodIssue => ({
    field: zodIssue.path.map(String).join('.'),
    message: zodIssue.message
  }))
}

/**
 * Formats an error with full context for display or logging
 * 
 * Implements Requirement 7.4: Error context formatting
 * 
 * @param error - Any error object
 * @returns Formatted error information
 * 
 * @example
 * ```typescript
 * try {
 *   await operation()
 * } catch (error) {
 *   const formatted = formatErrorWithContext(error)
 *   console.error('Operation failed:', formatted)
 *   
 *   // Display to user
 *   toast.error(formatted.message)
 *   
 *   // Show field errors if validation failed
 *   if (formatted.fields) {
 *     formatted.fields.forEach(({ field, message }) => {
 *       showFieldError(field, message)
 *     })
 *   }
 * }
 * ```
 */
export function formatErrorWithContext(error: unknown): FormattedError {
  // DatabaseApiError
  if (error instanceof DatabaseApiError) {
    return {
      message: error.getUserMessage(),
      type: error.type,
      context: error.details,
      retryable: error.isRetryable()
    }
  }
  
  // AppError
  if (error instanceof AppError) {
    return {
      message: error.userMessage,
      type: error.code,
      context: error.details as Record<string, unknown>,
      retryable: error.isRetryable
    }
  }
  
  // Zod validation error
  if (error instanceof ZodError) {
    return {
      message: 'Girilen bilgiler geçersiz. Lütfen kontrol edip tekrar deneyin.',
      type: 'VALIDATION',
      fields: formatValidationErrors(error),
      retryable: false
    }
  }
  
  // Standard Error
  if (error instanceof Error) {
    return {
      message: getUserFriendlyError(error),
      type: 'ERROR',
      context: {
        originalMessage: error.message,
        stack: error.stack
      },
      retryable: false
    }
  }
  
  // Unknown error type
  return {
    message: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
    type: 'UNKNOWN',
    context: { error },
    retryable: false
  }
}

/**
 * Gets error type classification from any error
 * 
 * @param error - Any error object
 * @returns Error type string
 */
export function getErrorType(error: unknown): string {
  if (error instanceof DatabaseApiError) {
    return error.type
  }
  
  if (error instanceof AppError) {
    return error.code
  }
  
  if (error instanceof ZodError) {
    return ErrorType.VALIDATION
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('timeout')) {
      return ErrorType.NETWORK
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return ErrorType.PERMISSION
    }
    
    if (message.includes('not found')) {
      return ErrorType.NOT_FOUND
    }
    
    if (message.includes('conflict') || message.includes('duplicate')) {
      return ErrorType.CONFLICT
    }
  }
  
  return ErrorType.UNKNOWN
}

/**
 * Checks if an error is retryable
 * 
 * @param error - Any error object
 * @returns true if the operation should be retried
 */
export function isErrorRetryable(error: unknown): boolean {
  if (error instanceof DatabaseApiError) {
    return error.isRetryable()
  }
  
  if (error instanceof AppError) {
    return error.isRetryable
  }
  
  // Check error message for retryable patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('503') ||
      message.includes('429') ||
      message.includes('econnreset') ||
      message.includes('enotfound')
    )
  }
  
  return false
}

/**
 * Creates an error message for rollback failures
 * 
 * Implements Requirement 7.5: Cleanup failure notification
 * 
 * @param primaryError - The original error that triggered rollback
 * @param rollbackErrors - Errors that occurred during rollback
 * @returns Formatted error message with cleanup instructions
 * 
 * @example
 * ```typescript
 * try {
 *   await transaction.execute()
 * } catch (error) {
 *   try {
 *     await transaction.rollback()
 *   } catch (rollbackError) {
 *     const message = formatRollbackError(error, [rollbackError])
 *     console.error(message)
 *     notifyAdmin(message)
 *   }
 * }
 * ```
 */
export function formatRollbackError(
  primaryError: unknown,
  rollbackErrors: unknown[]
): string {
  const primaryMessage = getUserFriendlyError(primaryError)
  
  if (rollbackErrors.length === 0) {
    return primaryMessage
  }
  
  const rollbackMessages = rollbackErrors
    .map(rollbackError => getUserFriendlyError(rollbackError))
    .join('\n- ')
  
  return `${primaryMessage}\n\nGeri alma işlemi sırasında hatalar oluştu:\n- ${rollbackMessages}\n\nManuel temizlik gerekebilir. Lütfen sistem yöneticisi ile iletişime geçin.`
}

/**
 * Creates an error message for batch operation failures
 * 
 * @param successCount - Number of successful operations
 * @param failureCount - Number of failed operations
 * @param sampleErrors - Sample errors from failures (max 3)
 * @returns Formatted batch error message
 * 
 * @example
 * ```typescript
 * const result = await processBatch(items, operation)
 * if (result.failures.length > 0) {
 *   const message = formatBatchError(
 *     result.successes.length,
 *     result.failures.length,
 *     result.failures.slice(0, 3).map(f => f.error)
 *   )
 *   toast.warning(message)
 * }
 * ```
 */
export function formatBatchError(
  successCount: number,
  failureCount: number,
  sampleErrors: unknown[]
): string {
  const total = successCount + failureCount
  
  let message = `Toplu işlem tamamlandı: ${successCount}/${total} başarılı`
  
  if (failureCount > 0) {
    message += `\n\n${failureCount} işlem başarısız oldu`
    
    if (sampleErrors.length > 0) {
      const errorMessages = sampleErrors
        .slice(0, 3)
        .map(sampleError => getUserFriendlyError(sampleError))
        .join('\n- ')
      
      message += `:\n- ${errorMessages}`
      
      if (failureCount > 3) {
        message += `\n... ve ${failureCount - 3} hata daha`
      }
    }
  }
  
  return message
}

/**
 * Creates an error message for version conflicts (optimistic locking)
 * 
 * @param resourceName - Name of the resource (e.g., "dergi", "kayıt")
 * @returns Formatted version conflict message
 * 
 * @example
 * ```typescript
 * if (currentVersion !== expectedVersion) {
 *   throw new Error(formatVersionConflictError('dergi'))
 * }
 * ```
 */
export function formatVersionConflictError(resourceName: string = 'kayıt'): string {
  return `Bu ${resourceName} başka bir kullanıcı tarafından değiştirildi. Lütfen sayfayı yenileyin ve tekrar deneyin.`
}

/**
 * Creates an error message for duplicate entries
 * 
 * @param fieldName - Name of the field that has a duplicate (e.g., "sayı numarası")
 * @param value - The duplicate value
 * @returns Formatted duplicate error message
 * 
 * @example
 * ```typescript
 * if (existingMagazine) {
 *   throw new Error(formatDuplicateError('sayı numarası', issueNumber))
 * }
 * ```
 */
export function formatDuplicateError(fieldName: string, value: string | number): string {
  return `${fieldName} "${value}" zaten mevcut. Lütfen farklı bir değer kullanın.`
}
