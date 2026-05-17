import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Requires authentication for server actions and API routes.
 * Redirects to /admin/login if user is not authenticated.
 * 
 * @returns The authenticated user
 * @throws Redirects to login page if not authenticated
 * 
 * @example
 * ```typescript
 * export async function myServerAction() {
 *   const session = await requireAuth()
 *   // Proceed with authenticated logic
 * }
 * ```
 */
export async function requireAuth(): Promise<User> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/admin/login')
  }
  
  return user
}

/**
 * Optionally gets the current authenticated user without redirecting.
 * Returns null if user is not authenticated.
 * 
 * @returns The user if authenticated, null otherwise
 * 
 * @example
 * ```typescript
 * export async function myServerAction() {
 *   const session = await getOptionalAuth()
 *   if (session) {
 *     // User is authenticated
 *   } else {
 *     // User is not authenticated
 *   }
 * }
 * ```
 */
export async function getOptionalAuth(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
