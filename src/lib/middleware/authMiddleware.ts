import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Session } from '@supabase/supabase-js'

/**
 * Requires authentication for server actions and API routes.
 * Redirects to /admin/login if user is not authenticated.
 * 
 * @returns The authenticated session
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
export async function requireAuth(): Promise<Session> {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    redirect('/admin/login')
  }
  
  return session
}

/**
 * Optionally gets the current authentication session without redirecting.
 * Returns null if user is not authenticated.
 * 
 * @returns The session if authenticated, null otherwise
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
export async function getOptionalAuth(): Promise<Session | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
