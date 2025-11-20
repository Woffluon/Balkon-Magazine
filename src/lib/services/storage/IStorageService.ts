import type { StorageFile, UploadOptions, ListOptions } from '@/types/storage'

/**
 * Storage Service Interface
 * 
 * Defines the contract for file storage operations.
 * Implementations should handle all storage interactions and
 * convert storage-specific errors to domain errors.
 * 
 * @example
 * ```typescript
 * const storage: IStorageService = new SupabaseStorageService(client)
 * await storage.upload('path/to/file.webp', blob, { upsert: true })
 * ```
 */
export interface IStorageService {
  /**
   * Uploads a file to storage
   * 
   * @param path - The storage path for the file
   * @param file - The file or blob to upload
   * @param options - Optional upload configuration
   * @returns Promise resolving when upload is complete
   * @throws {StorageError} If upload fails
   */
  upload(path: string, file: File | Blob, options?: UploadOptions): Promise<void>

  /**
   * Deletes multiple files from storage
   * 
   * @param paths - Array of file paths to delete
   * @returns Promise resolving when deletion is complete
   * @throws {StorageError} If deletion fails
   */
  delete(paths: string[]): Promise<void>

  /**
   * Moves a file from one path to another
   * 
   * @param fromPath - Source file path
   * @param toPath - Destination file path
   * @returns Promise resolving when move is complete
   * @throws {StorageError} If move fails
   */
  move(fromPath: string, toPath: string): Promise<void>

  /**
   * Copies a file from one path to another
   * 
   * @param fromPath - Source file path
   * @param toPath - Destination file path
   * @returns Promise resolving when copy is complete
   * @throws {StorageError} If copy fails
   */
  copy(fromPath: string, toPath: string): Promise<void>

  /**
   * Lists files in a storage directory
   * 
   * @param prefix - The directory prefix to list
   * @param options - Optional listing configuration (pagination)
   * @returns Promise resolving to array of storage files
   * @throws {StorageError} If listing fails
   */
  list(prefix: string, options?: ListOptions): Promise<StorageFile[]>

  /**
   * Gets the public URL for a file
   * 
   * @param path - The file path
   * @returns The public URL string
   */
  getPublicUrl(path: string): string
}
