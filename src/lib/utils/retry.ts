/**
 * Retry utility for handling transient failures with configurable backoff strategies
 * 
 * @module retry
 */

/**
 * Configuration options for retry behavior
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries: number

  /**
   * Base delay in milliseconds between retry attempts
   * @default 1000
   */
  delay: number

  /**
   * Backoff strategy for calculating delay between retries
   * - 'linear': delay * (attempt + 1)
   * - 'exponential': delay * 2^attempt
   * @default 'exponential'
   */
  backoff: 'linear' | 'exponential'
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  delay: 1000,
  backoff: 'exponential'
}

/**
 * Executes a function with automatic retry logic on failure
 * 
 * Implements Requirements 7.1-7.5:
 * - 7.1: Retries up to maxRetries times (default 3)
 * - 7.2: Uses exponential backoff (delay * 2^attempt) or linear backoff
 * - 7.3: Throws the last error after exhausting all retries
 * - 7.4: Returns data immediately on successful retry
 * - 7.5: Provides reusable utility function
 * 
 * @template T - The return type of the function being retried
 * @param fn - The async function to execute with retry logic
 * @param options - Configuration options for retry behavior
 * @returns Promise that resolves with the function result or rejects with the last error
 * 
 * @example
 * ```typescript
 * // Exponential backoff (default)
 * const data = await withRetry(
 *   () => supabase.from('magazines').select('*'),
 *   { maxRetries: 3, delay: 1000, backoff: 'exponential' }
 * )
 * 
 * // Linear backoff
 * const data = await withRetry(
 *   () => fetch('/api/data'),
 *   { maxRetries: 3, delay: 500, backoff: 'linear' }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { maxRetries, delay, backoff } = { ...DEFAULT_OPTIONS, ...options }
  
  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Attempt to execute the function
      const result = await fn()
      
      // Success - return immediately without further retries (Requirement 7.4)
      return result
    } catch (error) {
      // Store the error for potential re-throw
      lastError = error as Error

      // If this is not the last attempt, wait before retrying
      if (attempt < maxRetries - 1) {
        // Calculate delay based on backoff strategy (Requirement 7.2)
        const delayMs = backoff === 'exponential'
          ? delay * Math.pow(2, attempt)  // Exponential: delay * 2^attempt
          : delay * (attempt + 1)         // Linear: delay * (attempt + 1)

        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  // All retries exhausted - throw the last error (Requirement 7.3)
  throw lastError!
}
