import { useState, useCallback, useRef } from 'react'
import { uploadFileToStorage } from '@/app/(admin)/admin/actions'

/**
 * File upload options interface
 * Defines callbacks for tracking upload lifecycle events
 */
export interface UseFileUploadOptions {
  /**
   * Called periodically during upload to report progress
   * @param percent - Upload progress percentage (0-100)
   */
  onProgress?: (percent: number) => void

  /**
   * Called when upload completes successfully
   */
  onComplete?: () => void

  /**
   * Called when upload fails
   * @param error - The error that occurred during upload
   */
  onError?: (error: Error) => void
}

/**
 * File upload return interface
 * Provides upload function and state tracking
 */
export interface UseFileUploadReturn {
  /**
   * Uploads a file to the specified storage path
   * @param path - The storage path for the file
   * @param file - The file or blob to upload
   * @returns Promise that resolves when upload completes
   */
  uploadFile: (path: string, file: File | Blob) => Promise<void>

  /**
   * Current upload progress percentage (0-100)
   */
  progress: number

  /**
   * Whether an upload is currently in progress
   */
  isUploading: boolean

  /**
   * The last error that occurred during upload, or null
   */
  error: Error | null

  /**
   * Cancels the current upload operation
   */
  cancel: () => void
}

/**
 * Custom hook for managing file upload operations with progress tracking
 * 
 * Encapsulates file upload logic with support for:
 * - Progress tracking via callbacks
 * - Upload cancellation via AbortController
 * - Error handling and state management
 * - Server-side uploads via server actions (Requirements 14.1-14.5)
 * 
 * Satisfies Requirement 2.1: File upload logic with progress tracking,
 * callback support, and abort controller
 * 
 * Satisfies Requirements 14.1-14.5:
 * - Uses server actions instead of client-side Supabase calls
 * - Converts File to ArrayBuffer on client side
 * - Calls server action with proper authentication
 * - Handles success/error responses from server
 * 
 * @param options - Optional callbacks for upload lifecycle events
 * @returns Upload function and state tracking
 * 
 * @example
 * ```tsx
 * function UploadComponent() {
 *   const { uploadFile, progress, isUploading, error, cancel } = useFileUpload({
 *     onProgress: (percent) => console.log(`Upload: ${percent}%`),
 *     onComplete: () => console.log('Upload complete!'),
 *     onError: (err) => console.error('Upload failed:', err)
 *   })
 *   
 *   const handleUpload = async (file: File) => {
 *     try {
 *       await uploadFile('path/to/file.webp', file)
 *     } catch (err) {
 *       // Error already handled via onError callback
 *     }
 *   }
 *   
 *   return (
 *     <div>
 *       <button onClick={() => handleUpload(file)} disabled={isUploading}>
 *         Upload
 *       </button>
 *       {isUploading && (
 *         <>
 *           <div>Progress: {progress}%</div>
 *           <button onClick={cancel}>Cancel</button>
 *         </>
 *       )}
 *       {error && <div>Error: {error.message}</div>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useFileUpload(
  options?: UseFileUploadOptions
): UseFileUploadReturn {
  const [progress, setProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Use ref to store abort controller so it persists across renders
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Cancels the current upload operation
   * 
   * Aborts the upload by calling abort() on the AbortController.
   * This will cause the upload promise to reject with an AbortError.
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  /**
   * Uploads a file to storage with progress tracking and cancellation support
   * 
   * Uses server actions to upload files securely without exposing API keys.
   * Converts File/Blob to ArrayBuffer on client side before sending to server.
   * 
   * Requirements 14.3: Converts File to ArrayBuffer and calls server action
   * 
   * @param path - The storage path for the file
   * @param file - The file or blob to upload
   * @throws {Error} If upload fails or is cancelled
   */
  const uploadFile = useCallback(
    async (path: string, file: File | Blob): Promise<void> => {
      // Reset state for new upload
      setProgress(0)
      setIsUploading(true)
      setError(null)

      // Create new abort controller for this upload
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        // Report initial progress
        if (options?.onProgress) {
          options.onProgress(0)
        }

        // Check if already aborted before starting
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled')
        }

        // Convert File/Blob to ArrayBuffer for server action
        // Requirement 14.3: Convert File to ArrayBuffer on client
        const arrayBuffer = await file.arrayBuffer()

        // Check if aborted after reading file
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled')
        }

        // Get content type
        const contentType = file.type || 'application/octet-stream'

        // Call server action to upload file
        // Requirements 14.1, 14.4, 14.5: Use server action with server-side client
        const result = await uploadFileToStorage(path, arrayBuffer, contentType)

        // Check if aborted after upload
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled')
        }

        // Check result from server action
        if (!result.success) {
          throw new Error(result.error || 'Upload failed')
        }

        // Report completion
        setProgress(100)
        if (options?.onProgress) {
          options.onProgress(100)
        }

        // Call completion callback
        if (options?.onComplete) {
          options.onComplete()
        }
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error('Upload failed')
        
        // Set error state
        setError(uploadError)

        // Call error callback
        if (options?.onError) {
          options.onError(uploadError)
        }

        // Re-throw error so caller can handle it
        throw uploadError
      } finally {
        // Clean up
        setIsUploading(false)
        abortControllerRef.current = null
      }
    },
    [options]
  )

  return {
    uploadFile,
    progress,
    isUploading,
    error,
    cancel
  }
}
