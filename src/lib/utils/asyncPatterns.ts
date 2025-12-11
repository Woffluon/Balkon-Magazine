/**
 * Standardized Async Patterns and Type Safety Utilities
 * 
 * Provides consistent async/await patterns with proper error handling,
 * type guards for runtime type checking, and standardized promise utilities.
 * 
 * Requirements 7.1, 7.2, 7.3, 7.4, 7.5:
 * - Consistent async/await patterns with proper error handling
 * - Type guards instead of unsafe type assertions
 * - Standardized promise creation with error handling and cleanup
 * - Consistent Supabase client creation patterns
 * - Centralized utility functions for file paths
 */

import { logger } from '@/lib/services/Logger'
import { AppError } from '@/lib/errors/AppError'

/**
 * Type guard to check if a value is a Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return value !== null && 
         typeof value === 'object' && 
         'then' in value && 
         typeof (value as { then?: unknown }).then === 'function'
}

/**
 * Type guard to check if an error is an instance of Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Type guard to check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Type guard to check if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Type guard to check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Type guard to check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Async operation result type for consistent error handling
 */
export type AsyncResult<T> = {
  success: true
  data: T
} | {
  success: false
  error: AppError
}

/**
 * Creates a standardized async result for success cases
 */
export function createAsyncSuccess<T>(data: T): AsyncResult<T> {
  return { success: true, data }
}

/**
 * Creates a standardized async result for error cases
 */
export function createAsyncError<T>(error: AppError): AsyncResult<T> {
  return { success: false, error }
}

/**
 * Standardized async operation wrapper with consistent error handling
 * 
 * Wraps async operations to provide consistent error handling, logging,
 * and result formatting. Converts all errors to AppError instances.
 * 
 * @param operation - The async operation to execute
 * @param context - Context information for logging
 * @returns Promise resolving to AsyncResult<T>
 * 
 * @example
 * ```typescript
 * const result = await executeAsyncOperation(
 *   () => supabase.from('magazines').select('*'),
 *   { operation: 'fetchMagazines', component: 'MagazineList' }
 * )
 * 
 * if (result.success) {
 *   console.log('Data:', result.data)
 * } else {
 *   console.error('Error:', result.error.userMessage)
 * }
 * ```
 */
export async function executeAsyncOperation<T>(
  operation: () => Promise<T>,
  context: { operation: string; component?: string; [key: string]: unknown }
): Promise<AsyncResult<T>> {
  try {
    logger.debug('Starting async operation', context)
    
    const startTime = Date.now()
    const data = await operation()
    const duration = Date.now() - startTime
    
    logger.debug('Async operation completed successfully', {
      ...context,
      duration
    })
    
    return createAsyncSuccess(data)
  } catch (error) {
    logger.error('Async operation failed', {
      ...context,
      error: isError(error) ? error.message : String(error),
      stack: isError(error) ? error.stack : undefined
    })
    
    // Convert to AppError if not already
    const appError = isAppError(error) 
      ? error 
      : new AppError(
          isError(error) ? error.message : 'Unknown error occurred',
          'ASYNC_OPERATION_ERROR',
          500,
          'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.',
          true,
          { originalError: error, context }
        )
    
    return createAsyncError(appError)
  }
}

/**
 * Standardized promise creation with proper error handling and cleanup
 * 
 * Creates promises with consistent error handling, timeout support,
 * and automatic cleanup. Prevents memory leaks and provides better
 * error reporting.
 * 
 * @param executor - Promise executor function
 * @param options - Configuration options
 * @returns Promise with standardized error handling
 * 
 * @example
 * ```typescript
 * const result = await createStandardizedPromise<string>(
 *   (resolve, reject) => {
 *     const timer = setTimeout(() => {
 *       resolve('Operation completed')
 *     }, 1000)
 *     
 *     // Cleanup function will be called on timeout or completion
 *     return () => clearTimeout(timer)
 *   },
 *   { 
 *     timeout: 5000,
 *     context: { operation: 'delayedOperation' }
 *   }
 * )
 * ```
 */
export function createStandardizedPromise<T>(
  executor: (
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: unknown) => void
  ) => (() => void) | void,
  options: {
    timeout?: number
    context?: Record<string, unknown>
  } = {}
): Promise<T> {
  const { timeout, context = {} } = options
  
  return new Promise<T>((resolve, reject) => {
    let isSettled = false
    let cleanup: (() => void) | void
    let timeoutId: NodeJS.Timeout | undefined
    
    // Wrapper functions to prevent multiple settlements
    const safeResolve = (value: T | PromiseLike<T>) => {
      if (isSettled) return
      isSettled = true
      
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      if (cleanup) {
        try {
          cleanup()
        } catch (cleanupError) {
          logger.warn('Promise cleanup failed', {
            ...context,
            error: isError(cleanupError) ? cleanupError.message : String(cleanupError)
          })
        }
      }
      
      resolve(value)
    }
    
    const safeReject = (reason?: unknown) => {
      if (isSettled) return
      isSettled = true
      
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      if (cleanup) {
        try {
          cleanup()
        } catch (cleanupError) {
          logger.warn('Promise cleanup failed during rejection', {
            ...context,
            error: isError(cleanupError) ? cleanupError.message : String(cleanupError)
          })
        }
      }
      
      reject(reason)
    }
    
    // Set up timeout if specified
    if (timeout && timeout > 0) {
      timeoutId = setTimeout(() => {
        safeReject(new AppError(
          `Operation timed out after ${timeout}ms`,
          'TIMEOUT_ERROR',
          408,
          'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.',
          true,
          { timeout, context }
        ))
      }, timeout)
    }
    
    try {
      // Execute the promise
      cleanup = executor(safeResolve, safeReject)
    } catch (error) {
      safeReject(error)
    }
  })
}

/**
 * Standardized parallel execution with proper error handling
 * 
 * Executes multiple async operations in parallel with consistent
 * error handling and result aggregation. Uses Promise.allSettled
 * for better error resilience.
 * 
 * @param operations - Array of async operations to execute
 * @param options - Configuration options
 * @returns Promise resolving to array of results
 * 
 * @example
 * ```typescript
 * const results = await executeParallelOperations([
 *   () => fetchUser(1),
 *   () => fetchUser(2),
 *   () => fetchUser(3)
 * ], {
 *   context: { operation: 'fetchMultipleUsers' },
 *   failFast: false
 * })
 * 
 * results.forEach((result, index) => {
 *   if (result.success) {
 *     console.log(`User ${index + 1}:`, result.data)
 *   } else {
 *     console.error(`User ${index + 1} failed:`, result.error.userMessage)
 *   }
 * })
 * ```
 */
export async function executeParallelOperations<T>(
  operations: Array<() => Promise<T>>,
  options: {
    context?: Record<string, unknown>
    failFast?: boolean
  } = {}
): Promise<AsyncResult<T>[]> {
  const { context = {}, failFast = false } = options
  
  logger.debug('Starting parallel operations', {
    ...context,
    operationCount: operations.length,
    failFast
  })
  
  if (failFast) {
    // Use Promise.all for fail-fast behavior
    try {
      const results = await Promise.all(operations.map(op => op()))
      return results.map(data => createAsyncSuccess(data))
    } catch (error) {
      logger.error('Parallel operations failed (fail-fast)', {
        ...context,
        error: isError(error) ? error.message : String(error)
      })
      
      const appError = isAppError(error) 
        ? error 
        : new AppError(
            isError(error) ? error.message : 'Parallel operation failed',
            'PARALLEL_OPERATION_ERROR',
            500,
            'Paralel işlem başarısız oldu. Lütfen tekrar deneyin.',
            true,
            { originalError: error, context }
          )
      
      // Return array with single error for all operations
      return operations.map(() => createAsyncError<T>(appError))
    }
  } else {
    // Use Promise.allSettled for resilient behavior
    const results = await Promise.allSettled(operations.map(op => op()))
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return createAsyncSuccess(result.value)
      } else {
        logger.error(`Parallel operation ${index} failed`, {
          ...context,
          operationIndex: index,
          error: isError(result.reason) ? result.reason.message : String(result.reason)
        })
        
        const appError = isAppError(result.reason) 
          ? result.reason 
          : new AppError(
              isError(result.reason) ? result.reason.message : 'Operation failed',
              'PARALLEL_OPERATION_ERROR',
              500,
              'İşlem başarısız oldu. Lütfen tekrar deneyin.',
              true,
              { originalError: result.reason, context, operationIndex: index }
            )
        
        return createAsyncError<T>(appError)
      }
    })
  }
}

/**
 * Standardized sequential execution with proper error handling
 * 
 * Executes async operations sequentially with consistent error handling.
 * Useful when operations depend on each other or when you want to limit
 * resource usage.
 * 
 * @param operations - Array of async operations to execute
 * @param options - Configuration options
 * @returns Promise resolving to array of results
 * 
 * @example
 * ```typescript
 * const results = await executeSequentialOperations([
 *   () => createUser({ name: 'John' }),
 *   (prevResults) => createProfile(prevResults[0].data.id),
 *   (prevResults) => sendWelcomeEmail(prevResults[0].data.email)
 * ], {
 *   context: { operation: 'userOnboarding' },
 *   stopOnError: true
 * })
 * ```
 */
export async function executeSequentialOperations<T>(
  operations: Array<(previousResults: AsyncResult<T>[]) => Promise<T>>,
  options: {
    context?: Record<string, unknown>
    stopOnError?: boolean
  } = {}
): Promise<AsyncResult<T>[]> {
  const { context = {}, stopOnError = false } = options
  const results: AsyncResult<T>[] = []
  
  logger.debug('Starting sequential operations', {
    ...context,
    operationCount: operations.length,
    stopOnError
  })
  
  for (let i = 0; i < operations.length; i++) {
    try {
      const data = await operations[i](results)
      results.push(createAsyncSuccess(data))
      
      logger.debug(`Sequential operation ${i + 1} completed`, {
        ...context,
        operationIndex: i + 1,
        totalOperations: operations.length
      })
    } catch (error) {
      logger.error(`Sequential operation ${i + 1} failed`, {
        ...context,
        operationIndex: i + 1,
        error: isError(error) ? error.message : String(error)
      })
      
      const appError = isAppError(error) 
        ? error 
        : new AppError(
            isError(error) ? error.message : 'Sequential operation failed',
            'SEQUENTIAL_OPERATION_ERROR',
            500,
            'Sıralı işlem başarısız oldu. Lütfen tekrar deneyin.',
            true,
            { originalError: error, context, operationIndex: i + 1 }
          )
      
      results.push(createAsyncError<T>(appError))
      
      if (stopOnError) {
        logger.warn('Stopping sequential operations due to error', {
          ...context,
          stoppedAt: i + 1,
          totalOperations: operations.length
        })
        break
      }
    }
  }
  
  return results
}

/**
 * Utility to safely convert unknown values to specific types with type guards
 * 
 * Provides runtime type checking and conversion with proper error handling.
 * Replaces unsafe type assertions with type-safe conversions.
 * 
 * @param value - The value to convert
 * @param typeGuard - Type guard function to validate the type
 * @param errorMessage - Custom error message for type conversion failure
 * @returns The value cast to the expected type
 * @throws AppError if type conversion fails
 * 
 * @example
 * ```typescript
 * // Instead of: const id = data.id as string
 * const id = safeTypeConversion(data.id, isString, 'ID must be a string')
 * 
 * // Instead of: const count = response.count as number
 * const count = safeTypeConversion(response.count, isNumber, 'Count must be a number')
 * ```
 */
export function safeTypeConversion<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  errorMessage: string = 'Type conversion failed'
): T {
  if (typeGuard(value)) {
    return value
  }
  
  throw new AppError(
    `${errorMessage}: expected type but got ${typeof value}`,
    'TYPE_CONVERSION_ERROR',
    400,
    'Veri türü dönüştürme hatası. Lütfen geçerli veri gönderin.',
    false,
    { value, expectedType: errorMessage }
  )
}

/**
 * Utility to safely access nested object properties with type checking
 * 
 * Provides safe property access with runtime type checking.
 * Replaces unsafe property access with type-safe alternatives.
 * 
 * @param obj - The object to access
 * @param path - Array of property keys to traverse
 * @param typeGuard - Type guard function to validate the final value
 * @returns The property value if it exists and matches the type
 * @throws AppError if property access fails or type check fails
 * 
 * @example
 * ```typescript
 * // Instead of: const name = (data as any).user.profile.name as string
 * const name = safePropertyAccess(data, ['user', 'profile', 'name'], isString)
 * 
 * // Instead of: const count = (response as any).data.items.length as number
 * const count = safePropertyAccess(response, ['data', 'items', 'length'], isNumber)
 * ```
 */
export function safePropertyAccess<T>(
  obj: unknown,
  path: string[],
  typeGuard: (value: unknown) => value is T
): T {
  if (!isObject(obj)) {
    throw new AppError(
      'Cannot access property on non-object value',
      'PROPERTY_ACCESS_ERROR',
      400,
      'Özellik erişim hatası. Geçersiz veri yapısı.',
      false,
      { obj, path }
    )
  }
  
  let current: unknown = obj
  
  for (const key of path) {
    if (!isObject(current) || !(key in current)) {
      throw new AppError(
        `Property '${key}' not found in object`,
        'PROPERTY_ACCESS_ERROR',
        400,
        'Özellik bulunamadı. Geçersiz veri yapısı.',
        false,
        { path, missingKey: key }
      )
    }
    
    current = current[key]
  }
  
  if (!typeGuard(current)) {
    throw new AppError(
      `Property at path '${path.join('.')}' has incorrect type`,
      'PROPERTY_TYPE_ERROR',
      400,
      'Özellik türü hatası. Geçersiz veri türü.',
      false,
      { path, actualType: typeof current }
    )
  }
  
  return current
}