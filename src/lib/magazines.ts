import { createClient } from '@/lib/supabase/server'
import { Magazine } from '@/types/magazine'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'

/**
 * Retrieves all published magazines
 * Uses the repository pattern to abstract database access
 * 
 * @returns Promise resolving to array of published magazines
 * @throws {DatabaseError} If database query fails
 */
export async function getPublishedMagazines(): Promise<Magazine[]> {
  const supabase = await createClient()
  const repository = new SupabaseMagazineRepository(supabase)
  
  const allMagazines = await repository.findAll()
  
  // Filter for published magazines
  return allMagazines.filter(magazine => magazine.is_published)
}
