import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/config/env'

/**
 * Creates a Supabase client for browser/client-side usage
 * @returns Supabase client instance
 * @throws {Error} If Supabase environment variables are not configured
 */
export function createClient(): SupabaseClient {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

