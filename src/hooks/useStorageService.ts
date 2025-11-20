import { useMemo } from 'react'
import { useSupabaseClient } from './useSupabaseClient'
import { SupabaseStorageService } from '@/lib/services/storage/SupabaseStorageService'
import type { IStorageService } from '@/lib/services/storage/IStorageService'

/**
 * Custom hook that provides a memoized storage service instance
 * 
 * Creates a SupabaseStorageService with the browser Supabase client.
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
    return new SupabaseStorageService(supabase)
  }, [supabase])
}
