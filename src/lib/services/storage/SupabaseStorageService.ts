import type { SupabaseClient } from '@supabase/supabase-js'
import type { IStorageService } from './IStorageService'
import type { StorageFile, UploadOptions, ListOptions } from '@/types/storage'
import { StorageError } from '@/lib/errors/AppError'
import { STORAGE_CONFIG } from '@/lib/constants/storage'
import { assertStorageFileArray } from '@/lib/guards'
import { withRetry } from '@/lib/utils/retry'

/**
 * Supabase Storage Service Implementation
 * 
 * Implements the IStorageService interface using Supabase Storage.
 * Handles all file storage operations and converts Supabase errors
 * to domain-specific StorageError instances.
 * 
 * @example
 * ```typescript
 * const client = createClient()
 * const storage = new SupabaseStorageService(client)
 * await storage.upload('1/kapak.webp', blob, { upsert: true })
 * ```
 */
export class SupabaseStorageService implements IStorageService {
  constructor(
    private client: SupabaseClient,
    private bucketName: string = STORAGE_CONFIG.BUCKET
  ) {}

  /**
   * Uploads a file to Supabase Storage
   * 
   * Implements performance tracking (Requirements 7.4):
   * - Tracks operation timing
   * - Logs slow operations (> 1s)
   * 
   * @param path - The storage path for the file
   * @param file - The file or blob to upload
   * @param options - Optional upload configuration
   * @throws {StorageError} If upload fails
   */
  async upload(path: string, file: File | Blob, options?: UploadOptions): Promise<void> {
    const { logger } = await import('@/lib/services/Logger')
    const endTimer = logger.startTimer('storage.upload')
    
    try {
      const { error } = await this.client.storage
        .from(this.bucketName)
        .upload(path, file, {
          upsert: options?.upsert ?? STORAGE_CONFIG.DEFAULT_UPSERT,
          contentType: options?.contentType,
          cacheControl: options?.cacheControl ?? STORAGE_CONFIG.CACHE_CONTROL
        })

      if (error) {
        const { ErrorHandler } = await import('@/lib/errors/errorHandler')
        throw ErrorHandler.handleStorageError(error, 'upload', path)
      }
    } finally {
      endTimer()
    }
  }

  /**
   * Deletes multiple files from Supabase Storage
   * 
   * Implements performance tracking (Requirements 7.4):
   * - Tracks operation timing
   * - Logs slow operations (> 1s)
   * 
   * @param paths - Array of file paths to delete
   * @throws {StorageError} If deletion fails
   */
  async delete(paths: string[]): Promise<void> {
    if (paths.length === 0) {
      return
    }

    const { logger } = await import('@/lib/services/Logger')
    const endTimer = logger.startTimer('storage.delete')
    
    try {
      const { error } = await this.client.storage
        .from(this.bucketName)
        .remove(paths)

      if (error) {
        const { ErrorHandler } = await import('@/lib/errors/errorHandler')
        // For multiple files, use the first path as context
        const contextPath = paths.length > 0 ? paths[0] : undefined
        throw ErrorHandler.handleStorageError(error, 'delete', contextPath)
      }
    } finally {
      endTimer()
    }
  }

  /**
   * Deletes multiple files with partial retry support
   * 
   * Implements Requirement 6.3: Partial storage failures retry selectively
   * - Tracks successful vs failed operations
   * - Only retries failed operations
   * - Preserves successful operation results
   * - Returns combined results
   * 
   * @param paths - Array of file paths to delete
   * @param config - Optional retry configuration
   * @returns Promise resolving to batch operation results
   */
  async deleteWithPartialRetry(
    paths: string[],
    config?: Partial<import('@/lib/utils/retry').RetryConfig>
  ): Promise<import('@/lib/utils/retry').BatchOperationResult<string>> {
    const { withPartialRetry } = await import('@/lib/utils/retry')
    
    if (paths.length === 0) {
      return { successes: [], failures: [] }
    }

    // Delete each file individually to track partial failures
    return await withPartialRetry(
      paths,
      async (path) => {
        const { error } = await this.client.storage
          .from(this.bucketName)
          .remove([path])

        if (error) {
          const { ErrorHandler } = await import('@/lib/errors/errorHandler')
          throw ErrorHandler.handleStorageError(error, 'delete', path)
        }
      },
      config
    )
  }

  /**
   * Moves a file from one path to another
   * Falls back to copy+delete if move operation is not supported
   * 
   * @param fromPath - Source file path
   * @param toPath - Destination file path
   * @throws {StorageError} If move fails
   */
  async move(fromPath: string, toPath: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucketName)
      .move(fromPath, toPath)

    if (error) {
      // Fallback to copy + delete if move is not supported
      try {
        await this.copy(fromPath, toPath)
        await this.delete([fromPath])
      } catch (fallbackError) {
        const { ErrorHandler } = await import('@/lib/errors/errorHandler')
        throw ErrorHandler.handleStorageError(
          fallbackError instanceof Error ? fallbackError : error,
          'move',
          fromPath
        )
      }
    }
  }

  /**
   * Copies a file from one path to another
   * 
   * @param fromPath - Source file path
   * @param toPath - Destination file path
   * @throws {StorageError} If copy fails
   */
  async copy(fromPath: string, toPath: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucketName)
      .copy(fromPath, toPath)

    if (error) {
      const { ErrorHandler } = await import('@/lib/errors/errorHandler')
      throw ErrorHandler.handleStorageError(error, 'move', fromPath)
    }
  }

  /**
   * Lists files in a storage directory with pagination support
   * 
   * Implements retry logic (Requirements 7.1-7.5):
   * - Retries up to 3 times on network failures
   * - Uses exponential backoff (1s, 2s, 4s)
   * 
   * Implements performance tracking (Requirements 7.4):
   * - Tracks operation timing
   * - Logs slow operations (> 1s)
   * 
   * @param prefix - The directory prefix to list
   * @param options - Optional listing configuration (pagination)
   * @returns Array of storage files
   * @throws {StorageError} If listing fails after all retries
   */
  async list(prefix: string, options?: ListOptions): Promise<StorageFile[]> {
    const { logger } = await import('@/lib/services/Logger')
    const endTimer = logger.startTimer('storage.list')
    
    try {
      return await withRetry(
        async () => {
          const { data, error } = await this.client.storage
            .from(this.bucketName)
            .list(prefix, {
              limit: options?.limit ?? 1000,
              offset: options?.offset ?? 0
            })

          if (error) {
            const { ErrorHandler } = await import('@/lib/errors/errorHandler')
            throw ErrorHandler.handleStorageError(error, 'list', prefix)
          }

          const files = (data ?? []).map(item => ({
            name: item.name,
            id: item.id ?? null,
            path: prefix ? `${prefix}/${item.name}` : item.name
          }))

          // Validate data with runtime type guard
          return assertStorageFileArray(files)
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          backoffMultiplier: 2
        }
      )
    } finally {
      endTimer()
    }
  }

  /**
   * Gets the public URL for a file
   * 
   * @param path - The file path
   * @returns The public URL string
   */
  getPublicUrl(path: string): string {
    const { data } = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(path)

    return data.publicUrl
  }
}
