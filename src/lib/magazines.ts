import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/server'
import { Magazine } from '@/types/magazine'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'
import { ErrorHandler, Result } from '@/lib/errors/errorHandler'
import { logger } from '@/lib/services/Logger'

/**
 * Retrieves all published magazines with request-level caching
 * Uses the repository pattern to abstract database access
 * Cached for 1 hour with 'magazines' tag for on-demand revalidation
 * 
 * Implements retry logic (Requirements 6.2):
 * - Repository layer handles retries automatically
 * - Retries up to 3 times on transient failures
 * - Uses exponential backoff (1s, 2s, 4s)
 * - Returns data immediately on successful retry
 * 
 * Implements error handling (Requirement 1.2):
 * - Wraps database operations in try-catch
 * - Returns Result<Magazine[]> instead of throwing
 * - Logs errors with function context
 * 
 * @returns Promise resolving to Result containing array of published magazines or error
 */
export const getPublishedMagazines = unstable_cache(
  async (): Promise<Result<Magazine[]>> => {
    try {
      const supabase = createPublicClient()
      const repository = new SupabaseMagazineRepository(supabase)
      
      // Repository already has retry logic built-in (Requirements 6.2)
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
    revalidate: 3600, // 1 hour (Requirement 8.1)
    tags: ['magazines'] // Tag for on-demand revalidation (Requirement 8.2)
  }
)

/**
 * Retrieves a specific magazine by issue number with request-level caching
 * Uses the repository pattern to abstract database access
 * Cached for 1 hour with magazine-specific tag for granular invalidation
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
export const getMagazineByIssue = (issueNumber: number) => {
  return unstable_cache(
    async (): Promise<Magazine | null> => {
      const supabase = createPublicClient()
      const repository = new SupabaseMagazineRepository(supabase)
      
      // Repository already has retry logic built-in (Requirements 6.2)
      return await repository.findByIssue(issueNumber)
    },
    [`magazine-${issueNumber}`], // Cache key specific to issue
    {
      revalidate: 3600, // 1 hour (Requirement 8.1)
      tags: ['magazines', `magazine-${issueNumber}`] // Tags for granular invalidation (Requirement 8.2)
    }
  )()
}
