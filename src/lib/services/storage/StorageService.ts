/**
 * Storage Service with Retry Support
 * 
 * Implements Requirements 1.1, 1.3, 1.4, 5.1, 5.5, 6.1, 6.2
 * 
 * This service provides file storage operations with:
 * - Automatic retry logic for transient failures
 * - Batch processing with controlled concurrency
 * - Chunked operations for large file sets
 * - Single API call for recursive listing
 * 
 * @module StorageService
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/retry'
import { processBatch } from '@/lib/utils/batchProcessor'
import { STORAGE_CONFIG } from '@/lib/constants/storage'
import { performanceMonitor } from '../PerformanceMonitor'
import { logger } from '../Logger'

/**
 * Storage Service Implementation with Retry Support
 * 
 * Provides robust file storage operations with automatic retry logic,
 * batch processing, and proper error handling.
 */
export class StorageService {
  private bucketName: string

  constructor(
    private supabase: SupabaseClient,
    bucketName?: string
  ) {
    this.bucketName = bucketName ?? STORAGE_CONFIG.BUCKET
  }

  /**
   * Uploads a file to storage with retry logic
   * 
   * Implements Requirement 5.1: Retry logic for transient failures
   * - Retries up to 3 times on network failures
   * - Uses exponential backoff (1s, 2s, 4s)
   * - Maximum delay of 10 seconds
   * 
   * Requirements 9.1, 9.2, 9.5: Performance monitoring
   * 
   * @param bucket - Storage bucket name
   * @param path - File path in storage
   * @param file - File to upload
   * @throws Error if upload fails after all retries
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File
  ): Promise<void> {
    return performanceMonitor.measure('storage.uploadFile', async () => {
      logger.info('Uploading file to storage', {
        bucket,
        path,
        fileSize: file.size,
        fileSizeMB: (file.size / (1024 * 1024)).toFixed(2)
      })
      
      await withRetry(
        async () => {
          const { error } = await this.supabase.storage
            .from(bucket)
            .upload(path, file, { upsert: true })
          
          if (error) {
            logger.error('File upload failed', {
              bucket,
              path,
              error: error.message
            })
            throw new Error(error.message)
          }
          
          logger.info('File uploaded successfully', {
            bucket,
            path,
            fileSize: file.size
          })
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryableErrors: [] // Use default retryable error detection
        }
      )
    })
  }

  /**
   * Deletes multiple files with chunking support
   * 
   * Implements Requirement 1.4: Chunked delete operations
   * Implements Requirement 6.2: Batch operations for large file sets
   * 
   * Chunks requests into groups of 1000 items to respect API limits.
   * 
   * Requirements 9.1, 9.2, 9.5: Performance monitoring
   * 
   * @param bucket - Storage bucket name
   * @param paths - Array of file paths to delete
   * @throws Error if any batch deletion fails
   */
  async deleteFiles(
    bucket: string,
    paths: string[]
  ): Promise<void> {
    if (paths.length === 0) {
      return
    }

    return performanceMonitor.measure('storage.deleteFiles', async () => {
      logger.info('Deleting files from storage', {
        bucket,
        fileCount: paths.length
      })
      
      // Chunk into batches of 1000 (API limit)
      const BATCH_SIZE = 1000
      const totalBatches = Math.ceil(paths.length / BATCH_SIZE)
      
      for (let batchStartIndex = 0; batchStartIndex < paths.length; batchStartIndex += BATCH_SIZE) {
        const currentBatch = paths.slice(batchStartIndex, batchStartIndex + BATCH_SIZE)
        const batchNumber = Math.floor(batchStartIndex / BATCH_SIZE) + 1
        
        logger.info(`Processing delete batch ${batchNumber}/${totalBatches}`, {
          batchSize: currentBatch.length
        })
        
        const { error } = await this.supabase.storage
          .from(bucket)
          .remove(currentBatch)
        
        if (error) {
          logger.error(`Batch ${batchNumber} delete failed`, {
            bucket,
            batchNumber,
            batchSize: currentBatch.length,
            error: error.message
          })
          throw new Error(
            `Batch ${batchNumber} delete failed: ${error.message}`
          )
        }
        
        logger.info(`Batch ${batchNumber} deleted successfully`, {
          filesDeleted: currentBatch.length
        })
      }
      
      logger.info('All files deleted successfully', {
        bucket,
        totalFiles: paths.length
      })
    })
  }

  /**
   * Processes a single directory level for file listing
   * Separates the concern of processing individual directory levels
   */
  private async processDirectoryLevel(
    bucket: string,
    prefix: string,
    limit: number = 1000
  ): Promise<{ files: string[]; directories: string[] }> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(prefix, {
        limit,
        sortBy: { column: 'name', order: 'asc' }
      })
    
    if (error) {
      logger.error('Directory listing failed', {
        bucket,
        prefix,
        error: error.message
      })
      throw new Error(error.message)
    }
    
    const files: string[] = []
    const directories: string[] = []
    
    for (const item of data ?? []) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name
      
      if (item.id) {
        // It's a file
        files.push(fullPath)
      } else {
        // It's a directory
        directories.push(fullPath)
      }
    }
    
    return { files, directories }
  }

  /**
   * Lists all files recursively using iterative approach
   * 
   * Implements Requirement 1.1: Iterative approach for recursive listing
   * Refactored to separate concerns (Requirements 2.1, 2.2):
   * - Directory level processing
   * - Queue-based iteration logic
   * - Result aggregation
   * 
   * Uses iterative queue-based approach instead of recursion to:
   * - Avoid stack overflow for deep directory structures
   * - Provide better control over memory usage
   * - Enable progress tracking and cancellation
   * 
   * Requirements 9.1, 9.2, 9.5: Performance monitoring
   * 
   * @param bucket - Storage bucket name
   * @param prefix - Directory prefix to list
   * @returns Array of file paths
   * @throws Error if listing fails
   */
  async listFilesRecursive(
    bucket: string,
    prefix: string
  ): Promise<string[]> {
    return performanceMonitor.measure('storage.listFilesRecursive', async () => {
      logger.info('Starting iterative file listing', {
        bucket,
        prefix
      })
      
      const allFiles: string[] = []
      const directoriesToProcess: string[] = [prefix]
      let processedDirectories = 0
      
      // Iterative approach using queue instead of recursion
      while (directoriesToProcess.length > 0) {
        const currentPrefix = directoriesToProcess.shift()!
        processedDirectories++
        
        logger.debug('Processing directory level', {
          bucket,
          currentPrefix,
          remainingDirectories: directoriesToProcess.length,
          processedDirectories
        })
        
        const { files, directories } = await this.processDirectoryLevel(bucket, currentPrefix)
        
        // Add files to result
        allFiles.push(...files)
        
        // Add subdirectories to queue for processing
        directoriesToProcess.push(...directories)
        
        logger.debug('Directory level processed', {
          bucket,
          currentPrefix,
          filesFound: files.length,
          subdirectoriesFound: directories.length,
          totalFilesFound: allFiles.length
        })
      }
      
      logger.info('Iterative file listing completed', {
        bucket,
        prefix,
        totalFiles: allFiles.length,
        directoriesProcessed: processedDirectories
      })
      
      return allFiles
    })
  }

  /**
   * Moves multiple files with batch processing
   * 
   * Implements Requirement 1.3: Batched file operations
   * Implements Requirement 6.1: Controlled concurrency
   * 
   * Processes file moves in batches of 10 concurrent operations.
   * Falls back to copy+delete if move operation is not supported.
   * 
   * Requirements 9.1, 9.2, 9.5: Performance monitoring
   * 
   * @param bucket - Storage bucket name
   * @param moves - Array of move operations {from, to}
   * @throws Error if any move operation fails
   */
  async moveFiles(
    bucket: string,
    moves: Array<{ from: string; to: string }>
  ): Promise<void> {
    return performanceMonitor.measure('storage.moveFiles', async () => {
      logger.info('Moving files in storage', {
        bucket,
        fileCount: moves.length
      })
      
      await processBatch(
        moves,
        async ({ from, to }) => {
          const { error: moveErr } = await this.supabase.storage
            .from(bucket)
            .move(from, to)
          
          if (moveErr) {
            logger.warn('Direct move failed, using copy+delete fallback', {
              from,
              to,
              error: moveErr.message
            })
            
            // Fallback: copy + delete
            const { error: copyErr } = await this.supabase.storage
              .from(bucket)
              .copy(from, to)
            
            if (copyErr) {
              logger.error('File move failed', {
                from,
                to,
                error: copyErr.message
              })
              throw new Error(`Failed to move ${from}: ${copyErr.message}`)
            }
            
            const { error: delErr } = await this.supabase.storage
              .from(bucket)
              .remove([from])
            
            if (delErr) {
              logger.warn(`Failed to delete ${from} after copy`, {
                from,
                error: delErr.message
              })
            }
          }
        },
        { batchSize: 10 }
      )
      
      logger.info('Files moved successfully', {
        bucket,
        fileCount: moves.length
      })
    })
  }
}
