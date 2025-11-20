import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/**
 * Creates a simple Supabase client for public data access without cookies
 * Use this for cached operations that don't require authentication
 * @returns Supabase client instance
 * @throws {Error} If Supabase environment variables are not configured
 */
export function createPublicClient(): SupabaseClient {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Creates a Supabase client for server-side usage without authentication check
 * @returns Supabase client instance
 * @throws {Error} If Supabase environment variables are not configured
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Ignore errors in read-only contexts
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Ignore errors in read-only contexts
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase client for server-side usage (alias for createClient)
 * Use this when you don't need authentication
 * @returns Supabase client instance
 */
export async function getServerClient(): Promise<SupabaseClient> {
  return createClient()
}

/**
 * Creates a Supabase client for server-side usage with authentication check
 * Redirects to /admin/login if user is not authenticated
 * @returns Supabase client instance with authenticated session
 * @throws Redirects to login page if not authenticated
 */
export async function getAuthenticatedClient(): Promise<SupabaseClient> {
  const supabase = await createClient()
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    redirect('/admin/login')
  }
  
  return supabase
}

