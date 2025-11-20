import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/server'
import { Magazine } from '@/types/magazine'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'

/**
 * Retrieves all published magazines with request-level caching
 * Uses the repository pattern to abstract database access
 * Cached for 1 hour with 'magazines' tag for on-demand revalidation
 * 
 * @returns Promise resolving to array of published magazines
 * @throws {DatabaseError} If database query fails
 */
export const getPublishedMagazines = unstable_cache(
  async (): Promise<Magazine[]> => {
    const supabase = createPublicClient()
    const repository = new SupabaseMagazineRepository(supabase)
    
    const allMagazines = await repository.findAll()
    
    // Filter for published magazines
    return allMagazines.filter(magazine => magazine.is_published)
  },
  ['published-magazines'], // Cache key
  {
    revalidate: 3600, // 1 hour
    tags: ['magazines'] // Tag for on-demand revalidation
  }
)
