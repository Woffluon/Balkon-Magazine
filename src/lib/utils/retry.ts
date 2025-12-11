/**
 * Retry utility for handling transient failures with exponential backoff
 * 
 * Implements Requirement 6.2: Error Recovery and Resilience
 * Property 24: Transient errors trigger exponential backoff
 * 
 * @module retry
 */

import { AppError } from '@/lib/errors/AppError'

// Lazy import logger to avoid circular dependencies and env issues in tests
interface LoggerInterface {
  info: (message: string, context?: Record<string, unknown>) => void
  warn: (message: string, context?: Record<string, unknown>) => void
  error: (message: string, context?: Record<string, unknown>) => void
  debug: (message: string, context?: Record<string, unknown>) => void
}

let logger: LoggerInterface | null = null
async function getLogger(): Promise<LoggerInterface> {
  if (!logger) {
    try {
      const { logger: importedLogger } = await import('@/lib/services/Logger')
      logger = importedLogger
    } catch {
      // Fallback to console if logger is not available
      logger = {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.log
      }
    }
  }
  return logger
}

/**
 * Configuration options for retry behavior with exponential backoff
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts (including the initial attempt)
   * @default 3
   */
  maxAttempts: number

  /**
   * Initial delay in milliseconds before the first retry
   * @default 1000
   */
  initialDelay: number

  /**
   * Maximum delay in milliseconds between retry attempts
   * Prevents exponential backoff from growing indefinitely
   * @default 10000
   */
  maxDelay: number

  /**
   * Multiplier for exponential backoff calculation
   * delay_n = min(initialDelay * backoffMultiplier^n, maxDelay)
   * @default 2
   */
  backoffMultiplier: number

  /**
   * Array of error codes that should trigger a retry
   * If empty, all errors are considered retryable
   * @default []
   */
  retryableErrors: string[]
}

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: []
}

/**
 * Determines if an error should trigger a retry attempt
 * 
 * @param error - The error to check
 * @param retryableErrors - Array of error codes that are retryable
 * @returns true if the error should be retried, false otherwise
 */
function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  // If no specific retryable errors are configured, check the error's isRetryable flag
  if (retryableErrors.length === 0) {
    if (error instanceof AppError) {
      return error.isRetryable
    }
    // Unknown errors are not retryable by default
    return false
  }

  // Check if the error code is in the retryable list
  if (error instanceof AppError) {
    return retryableErrors.includes(error.code)
  }

  // Unknown errors are not retryable
  return false
}

/**
 * Calculates the delay for the next retry attempt using exponential backoff
 * 
 * Formula: delay_n = min(initialDelay * backoffMultiplier^attempt, maxDelay)
 * 
 * @param attempt - The current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt)
  return Math.min(exponentialDelay, config.maxDelay)
}

/**
 * Executes an async operation with automatic retry logic and exponential backoff
 * 
 * Implements Property 24: Transient errors trigger exponential backoff
 * For any database operation that fails with a transient error (timeout, connection),
 * retry delays follow exponential backoff: delay_n = min(initialDelay * 2^n, maxDelay)
 * 
 * @template T - The return type of the operation
 * @param operation - The async function to execute with retry logic
 * @param config - Partial retry configuration (merged with defaults)
 * @returns Promise that resolves with the operation result
 * @throws The last error if all retry attempts are exhausted
 * 
 * @example
 * ```typescript
 * // Retry database operation with default config
 * const result = await withRetry(
 *   () => supabase.from('magazines').select('*')
 * )
 * 
 * // Retry with custom configuration
 * const result = await withRetry(
 *   () => fetchData(),
 *   {
 *     maxAttempts: 5,
 *     initialDelay: 500,
 *     maxDelay: 5000,
 *     backoffMultiplier: 2,
 *     retryableErrors: ['TIMEOUT', 'CONNECTION_FAILED', 'RATE_LIMIT']
 *   }
 * )
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = { ...DEFAULT_CONFIG, ...config }
  
  let lastError: Error | AppError | unknown

  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    try {
      // Attempt to execute the operation
      const result = await operation()
      
      // Success - return immediately
      if (attempt > 0) {
        const log = await getLogger()
        log.info('Operation succeeded after retry', {
          attempt: attempt + 1,
          totalAttempts: finalConfig.maxAttempts
        })
      }
      
      return result
    } catch (error) {
      lastError = error

      // Check if this error is retryable
      const shouldRetry = isRetryableError(error, finalConfig.retryableErrors)
      
      // If not retryable, throw immediately
      if (!shouldRetry) {
        const log = await getLogger()
        log.warn('Non-retryable error encountered', {
          error: error instanceof Error ? error.message : String(error),
          attempt: attempt + 1
        })
        throw error
      }

      // If this is the last attempt, throw the error
      if (attempt >= finalConfig.maxAttempts - 1) {
        const log = await getLogger()
        log.error('All retry attempts exhausted', {
          error: error instanceof Error ? error.message : String(error),
          totalAttempts: finalConfig.maxAttempts
        })
        throw error
      }

      // Calculate delay for next retry using exponential backoff
      const delay = calculateDelay(attempt, finalConfig)
      
      const log = await getLogger()
      log.warn('Operation failed, retrying with exponential backoff', {
        attempt: attempt + 1,
        maxAttempts: finalConfig.maxAttempts,
        delayMs: delay,
        error: error instanceof Error ? error.message : String(error),
        errorCode: error instanceof AppError ? error.code : undefined
      })

      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError
}

/**
 * Result of a batch operation with partial retry support
 */
export interface BatchOperationResult<T> {
  /** Successfully completed operations */
  successes: T[]
  /** Failed operations with error details */
  failures: Array<{ item: T; error: string }>
}

/**
 * Executes batch operations with partial retry logic
 * 
 * Implements Property 25: Partial storage failures retry selectively
 * For any batch storage operation where some files succeed and others fail,
 * only the failed files should be retried while preserving successful results.
 * 
 * This function:
 * - Tracks successful vs failed operations
 * - Only retries failed operations
 * - Preserves successful operation results
 * - Returns combined results
 * 
 * @template T - The type of items being processed
 * @param items - Array of items to process
 * @param operation - Async function that processes a single item
 * @param config - Partial retry configuration (merged with defaults)
 * @returns Promise resolving to batch operation results with successes and failures
 * 
 * @example
 * ```typescript
 * // Delete multiple files with partial retry
 * const result = await withPartialRetry(
 *   filePaths,
 *   async (path) => await storageService.delete([path]),
 *   { maxAttempts: 3 }
 * )
 * 
 * console.log(`Deleted ${result.successes.length} files`)
 * console.log(`Failed to delete ${result.failures.length} files`)
 * ```
 */
export async function withPartialRetry<T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  config: Partial<RetryConfig> = {}
): Promise<BatchOperationResult<T>> {
  const finalConfig: RetryConfig = { ...DEFAULT_CONFIG, ...config }
  const successes: T[] = []
  const failures: Array<{ item: T; error: string }> = []
  
  // Track items that need to be retried
  let itemsToProcess = [...items]
  
  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    if (itemsToProcess.length === 0) {
      // All items processed successfully
      break
    }
    
    const log = await getLogger()
    log.debug('Executing batch operation', {
      attempt: attempt + 1,
      maxAttempts: finalConfig.maxAttempts,
      itemsToProcess: itemsToProcess.length,
      successesSoFar: successes.length,
      failuresSoFar: failures.length
    })
    
    // Execute operations in parallel using Promise.allSettled
    const results = await Promise.allSettled(
      itemsToProcess.map(item => operation(item))
    )
    
    // Track which items failed in this attempt
    const failedItems: T[] = []
    
    // Process results
    for (let resultIndex = 0; resultIndex < results.length; resultIndex++) {
      const operationResult = results[resultIndex]
      const currentItem = itemsToProcess[resultIndex]
      
      if (operationResult.status === 'fulfilled') {
        // Operation succeeded
        successes.push(currentItem)
        log.debug('Batch operation item succeeded', {
          attempt: attempt + 1,
          item: currentItem
        })
      } else {
        // Operation failed
        const operationError = operationResult.reason
        const shouldRetry = isRetryableError(operationError, finalConfig.retryableErrors)
        
        if (shouldRetry && attempt < finalConfig.maxAttempts - 1) {
          // Add to retry list
          failedItems.push(currentItem)
          log.debug('Batch operation item failed, will retry', {
            attempt: attempt + 1,
            item: currentItem,
            error: operationError instanceof Error ? operationError.message : String(operationError)
          })
        } else {
          // Non-retryable error or last attempt - add to permanent failures
          const errorMessage = operationError instanceof Error ? operationError.message : String(operationError)
          failures.push({ item: currentItem, error: errorMessage })
          log.warn('Batch operation item failed permanently', {
            attempt: attempt + 1,
            item: currentItem,
            error: errorMessage,
            retryable: shouldRetry,
            lastAttempt: attempt >= finalConfig.maxAttempts - 1
          })
        }
      }
    }
    
    // Update items to process for next attempt
    itemsToProcess = failedItems
    
    // If there are items to retry and this isn't the last attempt, wait before retrying
    if (itemsToProcess.length > 0 && attempt < finalConfig.maxAttempts - 1) {
      const delay = calculateDelay(attempt, finalConfig)
      log.info('Retrying failed batch operations with exponential backoff', {
        attempt: attempt + 1,
        maxAttempts: finalConfig.maxAttempts,
        itemsToRetry: itemsToProcess.length,
        delayMs: delay
      })
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  const log = await getLogger()
  log.info('Batch operation completed', {
    totalItems: items.length,
    successes: successes.length,
    failures: failures.length
  })
  
  return { successes, failures }
}
