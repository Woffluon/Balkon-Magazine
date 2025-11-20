import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * React hook that provides a memoized Supabase client for browser/client-side usage
 * The client instance is created once and reused across re-renders
 * 
 * @returns Memoized Supabase client instance
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const supabase = useSupabaseClient()
 *   
 *   const fetchData = async () => {
 *     const { data } = await supabase.from('magazines').select('*')
 *     return data
 *   }
 * }
 * ```
 */
export function useSupabaseClient(): SupabaseClient {
  return useMemo(() => createClient(), [])
}
