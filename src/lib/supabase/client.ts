import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/config/env'

/**
 * Creates a Supabase client for browser/client-side usage
 * @returns Supabase client instance
 * @throws {Error} If Supabase environment variables are not configured
 */
export function createClient(): SupabaseClient {
  return createBrowserClient(
    supabaseConfig.url,
    supabaseConfig.anonKey
  )
}

