import { useMemo } from 'react'
import { useSupabaseClient } from './useSupabaseClient'
import { StorageFactory } from '@/lib/services/storage/StorageFactory'
import type { IStorageService } from '@/lib/services/storage/IStorageService'

/**
 * Custom hook that provides a memoized storage service instance
 * 
 * Creates an appropriate IStorageService implementation (Supabase or R2) based on config.
 * The service instance is memoized to prevent unnecessary recreations
 * across component re-renders.
 * 
 * @returns Memoized storage service instance
 * 
 * @example
 * ```tsx
 * function UploadDialog() {
 *   const storageService = useStorageService()
 *   
 *   const uploadFile = async (file: File) => {
 *     await storageService.upload('path/to/file.webp', file, {
 *       upsert: true,
 *       contentType: 'image/webp'
 *     })
 *   }
 * }
 * ```
 */
export function useStorageService(): IStorageService {
  const supabase = useSupabaseClient()

  return useMemo(() => {
    return StorageFactory.getStorageService(supabase)
  }, [supabase])
}
