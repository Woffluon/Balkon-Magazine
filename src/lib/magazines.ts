import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { createPublicClient } from '@/lib/supabase/server'
import { Magazine } from '@/types/magazine'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'
import { ErrorHandler, Result } from '@/lib/errors/errorHandler'
import { logger } from '@/lib/services/Logger'

export const getPublishedMagazines = unstable_cache(
  async (): Promise<Result<Magazine[]>> => {
    try {
      const supabase = createPublicClient()
      const repository = new SupabaseMagazineRepository(supabase)
      
      const allMagazines = await repository.findAll()
      
      // Filter for published magazines
      const publishedMagazines = allMagazines.filter(magazine => magazine.is_published)
      
      return ErrorHandler.success(publishedMagazines)
    } catch (error) {
      // Log error with function context (Requirement 1.2)
      const appError = ErrorHandler.handleUnknownError(error)
      logger.error('Failed to fetch published magazines', {
        function: 'getPublishedMagazines',
        operation: 'findAll',
        error: {
          code: appError.code,
          message: appError.message,
          stack: appError.stack,
        },
      })
      
      return ErrorHandler.failure(appError)
    }
  },
  ['published-magazines'], // Cache key
  {
    revalidate: 60, // 60 seconds (Requirements 10.1)
    tags: ['magazines'] // Tag for on-demand revalidation (Requirements 10.2, 10.4)
  }
)

/**
 * Internal function to fetch magazine by issue number with Next.js caching
 * Uses unstable_cache for server-side caching with revalidation
 * 
 * Implements retry logic (Requirements 6.2):
 * - Repository layer handles retries automatically
 * - Retries up to 3 times on transient failures
 * - Uses exponential backoff (1s, 2s, 4s)
 * - Returns data immediately on successful retry
 * 
 * @param issueNumber - The issue number to retrieve
 * @returns Promise resolving to magazine or null if not found
 * @throws {DatabaseError} If database query fails after all retries
 */
const _getMagazineByIssueUncached = async (issueNumber: number): Promise<Magazine | null> => {
  const supabase = createPublicClient()
  const repository = new SupabaseMagazineRepository(supabase)
  
  // Repository already has retry logic built-in (Requirements 6.2)
  return await repository.findByIssue(issueNumber)
}

/**
 * Retrieves a specific magazine by issue number with dual-layer caching
 * 
 * Layer 1: React cache - Deduplicates requests within a single render pass
 * This ensures that if both page and generateMetadata call this function,
 * only one database query is executed (Requirements 1.5, 10.3)
 * 
 * Layer 2: Next.js unstable_cache - Caches across requests
 * Cached for 60 seconds with magazine-specific tag for granular invalidation
 * 
 * Implements retry logic (Requirements 6.2):
 * - Repository layer handles retries automatically
 * - Retries up to 3 times on transient failures
 * - Uses exponential backoff (1s, 2s, 4s)
 * - Returns data immediately on successful retry
 * 
 * @param issueNumber - The issue number to retrieve
 * @returns Promise resolving to magazine or null if not found
 * @throws {DatabaseError} If database query fails after all retries
 */
export const getMagazineByIssue = cache((issueNumber: number) => {
  return unstable_cache(
    () => _getMagazineByIssueUncached(issueNumber),
    [`magazine-${issueNumber}`], // Cache key specific to issue
    {
      revalidate: 60, // 60 seconds (Requirements 10.1)
      tags: ['magazines', `magazine-${issueNumber}`] // Tags for granular invalidation (Requirements 10.2, 10.4)
    }
  )()
})
