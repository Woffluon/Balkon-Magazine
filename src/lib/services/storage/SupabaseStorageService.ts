import type { SupabaseClient } from '@supabase/supabase-js'
import type { IStorageService } from './IStorageService'
import type { StorageFile, UploadOptions, ListOptions } from '@/types/storage'
import { StorageError } from '@/lib/errors/AppError'
import { STORAGE_CONFIG } from '@/lib/constants/storage'
import { assertStorageFileArray } from '@/lib/guards'

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
   * @param path - The storage path for the file
   * @param file - The file or blob to upload
   * @param options - Optional upload configuration
   * @throws {StorageError} If upload fails
   */
  async upload(path: string, file: File | Blob, options?: UploadOptions): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucketName)
      .upload(path, file, {
        upsert: options?.upsert ?? STORAGE_CONFIG.DEFAULT_UPSERT,
        contentType: options?.contentType,
        cacheControl: options?.cacheControl ?? STORAGE_CONFIG.CACHE_CONTROL
      })

    if (error) {
      throw new StorageError(`Failed to upload file to ${path}: ${error.message}`, error)
    }
  }

  /**
   * Deletes multiple files from Supabase Storage
   * 
   * @param paths - Array of file paths to delete
   * @throws {StorageError} If deletion fails
   */
  async delete(paths: string[]): Promise<void> {
    if (paths.length === 0) {
      return
    }

    const { error } = await this.client.storage
      .from(this.bucketName)
      .remove(paths)

    if (error) {
      throw new StorageError(`Failed to delete files: ${error.message}`, error)
    }
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
      } catch {
        throw new StorageError(
          `Failed to move file from ${fromPath} to ${toPath}: ${error.message}`,
          error
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
      throw new StorageError(
        `Failed to copy file from ${fromPath} to ${toPath}: ${error.message}`,
        error
      )
    }
  }

  /**
   * Lists files in a storage directory with pagination support
   * 
   * @param prefix - The directory prefix to list
   * @param options - Optional listing configuration (pagination)
   * @returns Array of storage files
   * @throws {StorageError} If listing fails
   */
  async list(prefix: string, options?: ListOptions): Promise<StorageFile[]> {
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .list(prefix, {
        limit: options?.limit ?? 1000,
        offset: options?.offset ?? 0
      })

    if (error) {
      throw new StorageError(`Failed to list files in ${prefix}: ${error.message}`, error)
    }

    const files = (data ?? []).map(item => ({
      name: item.name,
      id: item.id ?? null,
      path: prefix ? `${prefix}/${item.name}` : item.name
    }))

    // Validate data with runtime type guard
    return assertStorageFileArray(files)
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
