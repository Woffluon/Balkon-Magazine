/**
 * Batch processor utility for handling concurrent operations with controlled concurrency
 * 
 * Implements Requirements 6.1, 6.2: Batch Operations
 * Property 3: Batched file operations
 * Property 25: Concurrent batch size
 * Property 26: Large deletion chunking
 * 
 * @module batchProcessor
 */

/**
 * Configuration options for batch processing
 */
export interface BatchOptions {
  /**
   * Number of items to process concurrently in each batch
   * @default 10
   */
  batchSize: number

  /**
   * Optional callback to track progress as batches complete
   * @param processed - Number of items processed so far
   * @param total - Total number of items to process
   */
  onProgress?: (processed: number, total: number) => void
}

/**
 * Processes items in batches with controlled concurrency
 * 
 * Implements Property 3: Batched file operations
 * For any list of files to move, the system should process them in batches 
 * of the specified size concurrently, not sequentially.
 * 
 * Implements Property 25: Concurrent batch size
 * For any file move operation during rename, files should be processed 
 * in batches of exactly 10 concurrent operations.
 * 
 * @template T - The type of items being processed
 * @template R - The return type of the processor function
 * @param items - Array of items to process
 * @param processor - Async function that processes a single item
 * @param options - Batch processing configuration
 * @returns Promise resolving to array of results in the same order as input items
 * 
 * @example
 * ```typescript
 * // Move files in batches of 10
 * const results = await processBatch(
 *   filePaths,
 *   async (path) => await storageService.move(path, newPath),
 *   { 
 *     batchSize: 10,
 *     onProgress: (processed, total) => {
 *       console.log(`Progress: ${processed}/${total}`)
 *     }
 *   }
 * )
 * ```
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchOptions
): Promise<R[]> {
  const results: R[] = []
  const { batchSize, onProgress } = options

  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    
    // Process all items in the current batch concurrently
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    )
    
    results.push(...batchResults)
    
    // Report progress if callback provided
    if (onProgress) {
      const processed = Math.min(i + batch.length, items.length)
      onProgress(processed, items.length)
    }
  }

  return results
}

/**
 * Chunks a large array into smaller arrays of specified size
 * 
 * Implements Property 26: Large deletion chunking
 * For any deletion of more than 1000 files, the operation should be 
 * split into chunks of 1000 items each.
 * 
 * @template T - The type of items in the array
 * @param items - Array to chunk
 * @param chunkSize - Maximum size of each chunk
 * @returns Array of chunks
 * 
 * @example
 * ```typescript
 * // Chunk 5000 files into groups of 1000
 * const chunks = chunkArray(filePaths, 1000)
 * // chunks.length === 5
 * // chunks[0].length === 1000
 * // chunks[4].length === 1000
 * ```
 */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }
  
  return chunks
}

/**
 * Result of a batch operation with error tracking
 */
export interface BatchResult<T, R> {
  /** Successfully processed items with their results */
  successes: Array<{ item: T; result: R }>
  
  /** Failed items with error details */
  failures: Array<{ item: T; error: string }>
  
  /** Total number of items processed */
  total: number
  
  /** Number of successful operations */
  successCount: number
  
  /** Number of failed operations */
  failureCount: number
}

/**
 * Processes items in batches with error handling and detailed results
 * 
 * Unlike processBatch which throws on first error, this function continues
 * processing all items and returns detailed success/failure information.
 * 
 * Implements Property 27: Batch failure reporting
 * For any batch operation failure, the error message should indicate 
 * which batch failed and include error details.
 * 
 * @template T - The type of items being processed
 * @template R - The return type of the processor function
 * @param items - Array of items to process
 * @param processor - Async function that processes a single item
 * @param options - Batch processing configuration
 * @returns Promise resolving to detailed batch results
 * 
 * @example
 * ```typescript
 * // Delete files with error tracking
 * const result = await processBatchWithErrors(
 *   filePaths,
 *   async (path) => await storageService.delete(path),
 *   { batchSize: 10 }
 * )
 * 
 * console.log(`Deleted ${result.successCount} files`)
 * console.log(`Failed to delete ${result.failureCount} files`)
 * result.failures.forEach(f => console.error(`Failed: ${f.item} - ${f.error}`))
 * ```
 */
export async function processBatchWithErrors<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchOptions
): Promise<BatchResult<T, R>> {
  const successes: Array<{ item: T; result: R }> = []
  const failures: Array<{ item: T; error: string }> = []
  const { batchSize, onProgress } = options

  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    
    // Process all items in the current batch concurrently with error handling
    const batchResults = await Promise.allSettled(
      batch.map(item => processor(item))
    )
    
    // Categorize results
    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j]
      const item = batch[j]
      
      if (result.status === 'fulfilled') {
        successes.push({ item, result: result.value })
      } else {
        const error = result.reason
        const errorMessage = error instanceof Error ? error.message : String(error)
        failures.push({ item, error: errorMessage })
      }
    }
    
    // Report progress if callback provided
    if (onProgress) {
      const processed = Math.min(i + batch.length, items.length)
      onProgress(processed, items.length)
    }
  }

  return {
    successes,
    failures,
    total: items.length,
    successCount: successes.length,
    failureCount: failures.length
  }
}
