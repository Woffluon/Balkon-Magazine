import type { SupabaseClient } from '@supabase/supabase-js'
import type { IStorageService } from './IStorageService'
import { SupabaseStorageService } from './SupabaseStorageService'
import { R2StorageService } from './R2StorageService'
import { env } from '@/lib/env'

/**
 * Storage Provider Factory
 * 
 * Creates the appropriate storage service based on environment configuration.
 * By default, returns SupabaseStorageService if `NEXT_PUBLIC_STORAGE_PROVIDER` is 'supabase'.
 * If 'r2' is selected, returns R2StorageService.
 */
export class StorageFactory {
  /**
   * Returns a configured IStorageService implementation
   * 
   * @param supabase The Supabase client (only required if provider is Supabase)
   * @returns IStorageService implementation
   */
  static getStorageService(supabase?: SupabaseClient): IStorageService {
    if (env.NEXT_PUBLIC_STORAGE_PROVIDER === 'r2') {
      return new R2StorageService()
    }

    if (!supabase) {
      throw new Error('Supabase client is required when using Supabase Storage provider')
    }

    return new SupabaseStorageService(supabase)
  }
}
