import { env } from '@/lib/env'

/**
 * Environment Configuration
 * 
 * Provides type-safe access to validated environment variables.
 * All environment variables are pre-validated at application startup via the env module.
 */

/**
 * Validated Supabase configuration
 * 
 * Uses pre-validated environment variables from the env module.
 * No need for non-null assertions since validation happens at startup.
 */
export const supabaseConfig = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const

/**
 * Type guard to check if Supabase config is valid
 * 
 * @returns true if configuration is valid
 */
export function isSupabaseConfigValid(): boolean {
  try {
    return !!(supabaseConfig.url && supabaseConfig.anonKey)
  } catch {
    return false
  }
}
