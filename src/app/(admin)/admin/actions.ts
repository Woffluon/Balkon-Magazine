'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/authMiddleware'
import { parseFormDataWithZod } from '@/lib/validators/formDataParser'
import {
  MagazineFormSchema,
  DeleteMagazineSchema,
  RenameMagazineSchema
} from '@/lib/validators/formDataSchemas'
import { MagazineService } from '@/lib/services/MagazineService'
import { SupabaseStorageService } from '@/lib/services/storage/SupabaseStorageService'
import { STORAGE_PATHS } from '@/lib/constants/storage'
import { rateLimiter } from '@/lib/services/rateLimiting'
import { verifyCSRFOrigin, requireAdmin } from '@/lib/services/authorization'
import type { Result } from '@/lib/errors/errorHandler'

/**
 * Service factory helper function
 * Creates a MagazineService instance with all dependencies
 */
async function createMagazineService(): Promise<MagazineService> {
  const supabase = await createClient()
  
  // MagazineService will create its own StorageService instance
  return new MagazineService(supabase)
}

/**
 * Adds or updates a magazine record in the database
 * Uses upsert logic based on issue_number
 * 
 * Implements storage error handling (Requirements 1.3):
 * - Wraps operations in try-catch
 * - Returns Result<void> type
 * - Logs errors with context
 * 
 * @returns Result<void> indicating success or failure
 */
export async function addMagazineRecord(formData: FormData): Promise<Result<void>> {
  const { logger } = await import('@/lib/services/Logger')
  const { ErrorHandler } = await import('@/lib/errors/errorHandler')
  
  try {
    // Require admin role
    const authContext = await requireAdmin()
    const userId = authContext.userId
    
    logger.info('Add magazine record request received', {
      operation: 'addMagazineRecord',
      userId
    })
    
    // Verify CSRF origin
    await verifyCSRFOrigin()
    
    // Check upload rate limit
    if (!rateLimiter.checkUploadLimit(userId)) {
      const resetTime = rateLimiter.getUploadResetTime(userId)
      const minutesRemaining = resetTime ? Math.ceil(resetTime / 60000) : 60
      
      const { ValidationError } = await import('@/lib/errors/AppError')
      throw new ValidationError(
        `Upload limit exceeded. Maximum 10 uploads per hour. Please try again in ${minutesRemaining} minutes.`,
        'rate_limit',
        'upload_limit',
        `Yükleme limiti aşıldı. Lütfen ${minutesRemaining} dakika sonra tekrar deneyin.`
      )
    }
    
    const data = parseFormDataWithZod(formData, MagazineFormSchema)
    
    logger.info('Validated add magazine request', {
      operation: 'addMagazineRecord',
      issueNumber: data.issue_number,
      title: data.title,
      userId
    })
    
    const magazineService = await createMagazineService()
    await magazineService.createMagazine(data)
    
    // Record successful upload attempt
    rateLimiter.recordUploadAttempt(userId)
    
    logger.info('Magazine record added successfully', {
      operation: 'addMagazineRecord',
      issueNumber: data.issue_number,
      userId
    })
    
    // Revalidate cache and paths (Requirements 8.2, 8.4)
    revalidateTag('magazines') // Invalidate magazines cache
    revalidatePath('/admin')
    revalidatePath('/')
    revalidatePath(`/dergi/${data.issue_number}`)
    
    return ErrorHandler.success(undefined)
  } catch (error) {
    logger.error('Failed to add magazine record', {
      operation: 'addMagazineRecord',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    const appError = ErrorHandler.handleUnknownError(error)
    return ErrorHandler.failure(appError)
  }
}

/**
 * Deletes a magazine and all its associated storage files
 * 
 * Implements transactional consistency (Requirements 1.6, 6.4):
 * - Returns Result<void> type for type-safe error handling
 * - Logs all operations with context
 * - Provides detailed error responses
 * - Maintains transactional consistency (storage-first, database-second)
 */
export async function deleteMagazine(formData: FormData): Promise<Result<void>> {
  const { logger } = await import('@/lib/services/Logger')
  const { ErrorHandler } = await import('@/lib/errors/errorHandler')
  
  try {
    // Require admin role
    const authContext = await requireAdmin()
    
    logger.info('Delete magazine request received', {
      operation: 'deleteMagazine',
      userId: authContext.userId
    })
    
    // Verify CSRF origin
    await verifyCSRFOrigin()
    
    const data = parseFormDataWithZod(formData, DeleteMagazineSchema)
    
    logger.info('Validated delete magazine request', {
      operation: 'deleteMagazine',
      magazineId: data.id,
      issueNumber: data.issue_number,
      userId: authContext.userId
    })
    
    const magazineService = await createMagazineService()
    await magazineService.deleteMagazine(data)
    
    logger.info('Magazine deleted successfully', {
      operation: 'deleteMagazine',
      magazineId: data.id,
      issueNumber: data.issue_number,
      userId: authContext.userId
    })
    
    // Revalidate cache and paths (Requirements 8.2, 8.4)
    revalidateTag('magazines') // Invalidate magazines cache
    revalidatePath('/admin')
    revalidatePath('/')
    revalidatePath(`/dergi/${data.issue_number}`)
    
    return ErrorHandler.success(undefined)
  } catch (error) {
    logger.error('Failed to delete magazine', {
      operation: 'deleteMagazine',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    const appError = ErrorHandler.handleUnknownError(error)
    return ErrorHandler.failure(appError)
  }
}

/**
 * Renames a magazine by updating issue number and/or title
 * Moves all associated storage files to new paths
 * 
 * Implements comprehensive error handling (Requirements 1.7, 5.3, 6.5):
 * - Wraps entire operation in try-catch
 * - Tracks individual file operation results
 * - Uses Promise.allSettled for parallel operations (in MagazineService)
 * - Returns detailed failure reports
 * - Implements partial success handling
 * 
 * @returns Result<void> with detailed error information on failure
 */
export async function renameMagazine(formData: FormData): Promise<Result<void>> {
  const { logger } = await import('@/lib/services/Logger')
  const { ErrorHandler } = await import('@/lib/errors/errorHandler')
  
  try {
    // Require admin role
    const authContext = await requireAdmin()
    
    logger.info('Rename magazine request received', {
      operation: 'renameMagazine',
      userId: authContext.userId
    })
    
    // Verify CSRF origin
    await verifyCSRFOrigin()
    
    const data = parseFormDataWithZod(formData, RenameMagazineSchema)
    
    logger.info('Validated rename magazine request', {
      operation: 'renameMagazine',
      magazineId: data.id,
      oldIssue: data.old_issue,
      newIssue: data.new_issue,
      newTitle: data.new_title,
      version: data.version,
      userId: authContext.userId
    })
    
    const magazineService = await createMagazineService()
    await magazineService.renameMagazine(data)
    
    logger.info('Magazine renamed successfully', {
      operation: 'renameMagazine',
      magazineId: data.id,
      oldIssue: data.old_issue,
      newIssue: data.new_issue,
      userId: authContext.userId
    })
    
    // Revalidate cache and paths (Requirements 8.2, 8.4)
    revalidateTag('magazines') // Invalidate magazines cache
    revalidatePath('/admin')
    revalidatePath('/')
    revalidatePath(`/dergi/${data.old_issue}`)
    revalidatePath(`/dergi/${data.new_issue}`)
    
    return ErrorHandler.success(undefined)
  } catch (error) {
    logger.error('Failed to rename magazine', {
      operation: 'renameMagazine',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    const appError = ErrorHandler.handleUnknownError(error)
    return ErrorHandler.failure(appError)
  }
}

/**
 * Saves upload logs to storage
 * Uses SupabaseStorageService for consistent storage operations
 * 
 * Implements storage error handling (Requirements 1.3):
 * - Wraps storage operations in try-catch
 * - Transforms storage errors to StorageError
 * - Returns Result<string> type
 * - Logs errors with context
 * 
 * @returns Result<string> with log path on success or error details on failure
 */
export async function saveUploadLog(issue: string, content: string): Promise<Result<string>> {
  const { logger } = await import('@/lib/services/Logger')
  const { ErrorHandler } = await import('@/lib/errors/errorHandler')
  
  try {
    const supabase = await createClient()
    const storageService = new SupabaseStorageService(supabase)
    
    const issueNumber = parseInt(issue, 10)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const path = STORAGE_PATHS.getLogsPath(issueNumber, timestamp)
    
    logger.debug('Saving upload log', {
      operation: 'saveUploadLog',
      issueNumber,
      path
    })
    
    const data = new TextEncoder().encode(content)
    const blob = new Blob([data], { type: 'text/plain' })
    
    await storageService.upload(path, blob, {
      contentType: 'text/plain',
      upsert: true
    })
    
    logger.info('Upload log saved successfully', {
      operation: 'saveUploadLog',
      issueNumber,
      path
    })
    
    return ErrorHandler.success(path)
  } catch (error) {
    logger.error('Failed to save upload log', {
      operation: 'saveUploadLog',
      issue,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    const appError = ErrorHandler.handleUnknownError(error)
    return ErrorHandler.failure(appError)
  }
}

/**
 * Revalidates a specific magazine page by issue number
 * Triggers on-demand ISR revalidation for the magazine detail page
 * Also revalidates the home page to reflect any changes
 */
export async function revalidateMagazinePage(issueNumber: number) {
  await requireAuth()
  
  revalidatePath(`/dergi/${issueNumber}`)
  revalidatePath('/') // Also revalidate home page
  
  return { success: true, revalidated: [`/dergi/${issueNumber}`, '/'] }
}

/**
 * Revalidates the magazines cache tag
 * Triggers on-demand revalidation for all cached magazine data
 * Use this after publishing/unpublishing magazines or updating magazine metadata
 */
export async function revalidateMagazines() {
  await requireAuth()
  
  revalidateTag('magazines')
  revalidatePath('/') // Also revalidate home page
  
  return { success: true, revalidated: 'magazines tag' }
}

/**
 * Uploads a file to storage using server-side Supabase client
 * 
 * This server action handles file uploads securely on the server side,
 * preventing API keys from being exposed to the client.
 * 
 * Requirements 14.1-14.5:
 * - 14.1: Server action for file uploads instead of client-side calls
 * - 14.2: Marked with "use server" directive
 * - 14.3: Accepts ArrayBuffer from client (converted from File)
 * - 14.4: Uses server-side Supabase client with proper authentication
 * - 14.5: Returns success/error status to client
 * 
 * Implements storage error handling (Requirements 1.3):
 * - Wraps storage operations in try-catch
 * - Transforms storage errors to StorageError
 * - Returns Result<void> type
 * - Logs errors with context
 * 
 * @param path - The storage path for the file
 * @param fileData - The file data as ArrayBuffer
 * @param contentType - The MIME type of the file
 * @returns Result<void> indicating success or failure
 */
export async function uploadFileToStorage(
  path: string,
  fileData: ArrayBuffer,
  contentType: string
): Promise<Result<void>> {
  const { logger } = await import('@/lib/services/Logger')
  const { ErrorHandler } = await import('@/lib/errors/errorHandler')
  
  try {
    // Require admin role for file uploads
    await requireAdmin()
    
    // Verify CSRF origin
    await verifyCSRFOrigin()
    
    logger.debug('Starting file upload', {
      operation: 'uploadFileToStorage',
      path,
      contentType,
      size: fileData.byteLength
    })
    
    // Create storage service with server-side Supabase client
    const supabase = await createClient()
    const storageService = new SupabaseStorageService(supabase)
    
    // Convert ArrayBuffer to Blob for upload
    const blob = new Blob([fileData], { type: contentType })
    
    // Upload file to storage
    await storageService.upload(path, blob, {
      upsert: true,
      contentType
    })
    
    logger.info('File uploaded successfully', {
      operation: 'uploadFileToStorage',
      path,
      size: fileData.byteLength
    })
    
    return ErrorHandler.success(undefined)
  } catch (error) {
    logger.error('Server-side upload error', {
      operation: 'uploadFileToStorage',
      path,
      contentType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    const appError = ErrorHandler.handleUnknownError(error)
    return ErrorHandler.failure(appError)
  }
}

