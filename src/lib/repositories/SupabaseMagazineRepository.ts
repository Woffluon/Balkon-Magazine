import type { SupabaseClient } from '@supabase/supabase-js'
import type { Magazine } from '@/types/magazine'
import type { CreateMagazineDto, UpdateMagazineDto } from '@/types/dtos'
import type { IMagazineRepository } from './IMagazineRepository'
import { assertMagazine, assertMagazineArray } from '@/lib/guards'
import { withRetry } from '@/lib/utils/retry'
import { ErrorHandler } from '@/lib/errors/errorHandler'
import { logger } from '@/lib/services/Logger'

/**
 * Retryable database error codes for transient failures
 * 
 * PostgreSQL error codes:
 * - 08000: Connection exception
 * - 08003: Connection does not exist
 * - 08006: Connection failure
 * - 57P03: Cannot connect now
 * 
 * PostgREST error codes:
 * - PGRST301: Timeout
 * - PGRST504: Gateway timeout
 */
const RETRYABLE_DB_ERROR_CODES = [
  'PGRST301',  // Timeout
  'PGRST504',  // Gateway timeout
  '08000',     // Connection exception
  '08003',     // Connection does not exist
  '08006',     // Connection failure
  '57P03',     // Cannot connect now
]

/**
 * Supabase implementation of the Magazine Repository
 * 
 * Handles all database operations for magazines using Supabase client.
 * Converts all Supabase errors to DatabaseError for consistent error handling.
 * 
 * @example
 * ```typescript
 * const client = createClient()
 * const repository = new SupabaseMagazineRepository(client)
 * const magazines = await repository.findAll()
 * ```
 */
export class SupabaseMagazineRepository implements IMagazineRepository {
  constructor(private client: SupabaseClient) {}

  /**
   * Retrieves all magazines ordered by issue number (descending)
   * 
   * Implements retry logic (Requirements 6.2):
   * - Retries up to 3 times on transient failures
   * - Uses exponential backoff (1s, 2s, 4s)
   * - Retries on timeout and connection errors
   * 
   * Implements error message separation (Requirements 4.3, 4.6):
   * - Shows generic user message
   * - Logs technical details separately
   * 
   * Implements performance tracking (Requirements 7.4):
   * - Tracks operation timing
   * - Logs slow operations (> 1s)
   */
  async findAll(): Promise<Magazine[]> {
    const endTimer = logger.startTimer('db.magazines.findAll')
    
    try {
      return await withRetry(
        async () => {
          const { data, error } = await this.client
            .from('magazines')
            .select('*')
            .order('issue_number', { ascending: false })

          if (error) {
            // Log technical details separately (Requirements 4.3)
            logger.error('Database select operation failed', {
              operation: 'select',
              table: 'magazines',
              errorCode: error.code,
              errorMessage: error.message,
              errorDetails: error.details,
              hint: error.hint
            })
            
            // Use ErrorHandler to create typed error with catalog message (Requirements 4.6)
            const dbError = ErrorHandler.handleSupabaseError(error, 'select', 'magazines')
            throw dbError
          }

          // Validate data with runtime type guard
          return assertMagazineArray(data ?? [])
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryableErrors: RETRYABLE_DB_ERROR_CODES
        }
      )
    } finally {
      endTimer()
    }
  }

  /**
   * Finds a magazine by its issue number
   * Returns null if not found instead of throwing an error
   * 
   * Implements retry logic (Requirements 6.2):
   * - Retries up to 3 times on transient failures
   * - Uses exponential backoff (1s, 2s, 4s)
   * - Does not retry on "not found" errors (PGRST116)
   * 
   * Implements error message separation (Requirements 4.3, 4.6):
   * - Shows generic user message
   * - Logs technical details separately
   * 
   * Implements performance tracking (Requirements 7.4):
   * - Tracks operation timing
   * - Logs slow operations (> 1s)
   */
  async findByIssue(issueNumber: number): Promise<Magazine | null> {
    const endTimer = logger.startTimer('db.magazines.findByIssue')
    
    try {
      return await withRetry(
        async () => {
          const { data, error } = await this.client
            .from('magazines')
            .select('*')
            .eq('issue_number', issueNumber)
            .single()

          if (error) {
            // PGRST116 is the "not found" error code from PostgREST
            if (error.code === 'PGRST116') {
              return null
            }
            
            // Log technical details separately (Requirements 4.3)
            logger.error('Database select operation failed', {
              operation: 'select',
              table: 'magazines',
              issueNumber,
              errorCode: error.code,
              errorMessage: error.message,
              errorDetails: error.details,
              hint: error.hint
            })
            
            // Use ErrorHandler to create typed error with catalog message (Requirements 4.6)
            const dbError = ErrorHandler.handleSupabaseError(error, 'select', 'magazines')
            throw dbError
          }

          // Validate data with runtime type guard
          return data ? assertMagazine(data) : null
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryableErrors: RETRYABLE_DB_ERROR_CODES
        }
      )
    } finally {
      endTimer()
    }
  }

  /**
   * Finds a magazine by its unique ID
   * Returns null if not found instead of throwing an error
   * 
   * Implements retry logic (Requirements 6.2):
   * - Retries up to 3 times on transient failures
   * - Uses exponential backoff (1s, 2s, 4s)
   * - Does not retry on "not found" errors (PGRST116)
   * 
   * Implements error message separation (Requirements 4.3, 4.6):
   * - Shows generic user message
   * - Logs technical details separately
   * 
   * Implements performance tracking (Requirements 7.4):
   * - Tracks operation timing
   * - Logs slow operations (> 1s)
   */
  async findById(id: string): Promise<Magazine | null> {
    const endTimer = logger.startTimer('db.magazines.findById')
    
    try {
      return await withRetry(
        async () => {
          const { data, error } = await this.client
            .from('magazines')
            .select('*')
            .eq('id', id)
            .single()

          if (error) {
            // PGRST116 is the "not found" error code from PostgREST
            if (error.code === 'PGRST116') {
              return null
            }
            
            // Log technical details separately (Requirements 4.3)
            logger.error('Database select operation failed', {
              operation: 'select',
              table: 'magazines',
              magazineId: id,
              errorCode: error.code,
              errorMessage: error.message,
              errorDetails: error.details,
              hint: error.hint
            })
            
            // Use ErrorHandler to create typed error with catalog message (Requirements 4.6)
            const dbError = ErrorHandler.handleSupabaseError(error, 'select', 'magazines')
            throw dbError
          }

          // Validate data with runtime type guard
          return data ? assertMagazine(data) : null
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryableErrors: RETRYABLE_DB_ERROR_CODES
        }
      )
    } finally {
      endTimer()
    }
  }

  /**
   * Creates a new magazine record with upsert logic
   * If a magazine with the same issue_number exists, it will be updated
   * 
   * Implements retry logic (Requirements 6.2):
   * - Retries up to 3 times on transient failures
   * - Uses exponential backoff (1s, 2s, 4s)
   * - Retries on timeout and connection errors
   * 
   * Implements error message separation (Requirements 4.3, 4.6):
   * - Shows generic user message
   * - Logs technical details separately
   * 
   * Implements performance tracking (Requirements 7.4):
   * - Tracks operation timing
   * - Logs slow operations (> 1s)
   */
  async create(dto: CreateMagazineDto): Promise<Magazine> {
    const endTimer = logger.startTimer('db.magazines.create')
    
    try {
      return await withRetry(
        async () => {
          const { data, error } = await this.client
            .from('magazines')
            .upsert(dto, { onConflict: 'issue_number' })
            .select()
            .single()

          if (error) {
            // Log technical details separately (Requirements 4.3)
            logger.error('Database insert operation failed', {
              operation: 'insert',
              table: 'magazines',
              issueNumber: dto.issue_number,
              errorCode: error.code,
              errorMessage: error.message,
              errorDetails: error.details,
              hint: error.hint
            })
            
            // Use ErrorHandler to create typed error with catalog message (Requirements 4.6)
            const dbError = ErrorHandler.handleSupabaseError(error, 'insert', 'magazines')
            throw dbError
          }

          // Validate data with runtime type guard
          return assertMagazine(data)
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryableErrors: RETRYABLE_DB_ERROR_CODES
        }
      )
    } finally {
      endTimer()
    }
  }

  /**
   * Updates an existing magazine record
   * 
   * Implements retry logic (Requirements 6.2):
   * - Retries up to 3 times on transient failures
   * - Uses exponential backoff (1s, 2s, 4s)
   * - Retries on timeout and connection errors
   * 
   * Implements error message separation (Requirements 4.3, 4.6):
   * - Shows generic user message
   * - Logs technical details separately
   * 
   * Implements performance tracking (Requirements 7.4):
   * - Tracks operation timing
   * - Logs slow operations (> 1s)
   */
  async update(id: string, dto: UpdateMagazineDto): Promise<Magazine> {
    const endTimer = logger.startTimer('db.magazines.update')
    
    try {
      return await withRetry(
        async () => {
          const { data, error } = await this.client
            .from('magazines')
            .update(dto)
            .eq('id', id)
            .select()
            .single()

          if (error) {
            // Log technical details separately (Requirements 4.3)
            logger.error('Database update operation failed', {
              operation: 'update',
              table: 'magazines',
              magazineId: id,
              updateData: dto,
              errorCode: error.code,
              errorMessage: error.message,
              errorDetails: error.details,
              hint: error.hint
            })
            
            // Use ErrorHandler to create typed error with catalog message (Requirements 4.6)
            const dbError = ErrorHandler.handleSupabaseError(error, 'update', 'magazines')
            throw dbError
          }

          // Validate data with runtime type guard
          return assertMagazine(data)
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryableErrors: RETRYABLE_DB_ERROR_CODES
        }
      )
    } finally {
      endTimer()
    }
  }

  /**
   * Deletes a magazine record
   * 
   * Implements retry logic (Requirements 6.2):
   * - Retries up to 3 times on transient failures
   * - Uses exponential backoff (1s, 2s, 4s)
   * - Retries on timeout and connection errors
   * 
   * Implements error message separation (Requirements 4.3, 4.6):
   * - Shows generic user message
   * - Logs technical details separately
   * 
   * Implements performance tracking (Requirements 7.4):
   * - Tracks operation timing
   * - Logs slow operations (> 1s)
   */
  async delete(id: string): Promise<void> {
    const endTimer = logger.startTimer('db.magazines.delete')
    
    try {
      return await withRetry(
        async () => {
          const { error } = await this.client
            .from('magazines')
            .delete()
            .eq('id', id)

          if (error) {
            // Log technical details separately (Requirements 4.3)
            logger.error('Database delete operation failed', {
              operation: 'delete',
              table: 'magazines',
              magazineId: id,
              errorCode: error.code,
              errorMessage: error.message,
              errorDetails: error.details,
              hint: error.hint
            })
            
            // Use ErrorHandler to create typed error with catalog message (Requirements 4.6)
            const dbError = ErrorHandler.handleSupabaseError(error, 'delete', 'magazines')
            throw dbError
          }
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryableErrors: RETRYABLE_DB_ERROR_CODES
        }
      )
    } finally {
      endTimer()
    }
  }
}
