'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/authMiddleware'
import { parseFormDataWithZod } from '@/lib/validators/formDataParser'
import {
  createMagazineSchema,
  deleteMagazineSchema,
  renameMagazineSchema
} from '@/lib/validators/magazineSchemas'
import { MagazineService } from '@/lib/services/MagazineService'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'
import { SupabaseStorageService } from '@/lib/services/storage/SupabaseStorageService'
import { STORAGE_PATHS } from '@/lib/constants/storage'
import { rateLimiter } from '@/lib/services/rateLimiting'
import { verifyCSRFOrigin, requireAdmin } from '@/lib/services/authorization'

/**
 * Service factory helper function
 * Creates a MagazineService instance with all dependencies
 */
async function createMagazineService(): Promise<MagazineService> {
  const supabase = await createClient()
  const magazineRepository = new SupabaseMagazineRepository(supabase)
  const storageService = new SupabaseStorageService(supabase)
  
  return new MagazineService(magazineRepository, storageService)
}

/**
 * Adds or updates a magazine record in the database
 * Uses upsert logic based on issue_number
 */
export async function addMagazineRecord(formData: FormData) {
  // Require admin role
  const authContext = await requireAdmin()
  const userId = authContext.userId
  
  // Verify CSRF origin
  await verifyCSRFOrigin()
  
  // Check upload rate limit
  if (!rateLimiter.checkUploadLimit(userId)) {
    const resetTime = rateLimiter.getUploadResetTime(userId)
    const minutesRemaining = resetTime ? Math.ceil(resetTime / 60000) : 60
    
    throw new Error(
      `Upload limit exceeded. Maximum 10 uploads per hour. Please try again in ${minutesRemaining} minutes.`
    )
  }
  
  const data = parseFormDataWithZod(formData, createMagazineSchema)
  
  const magazineService = await createMagazineService()
  await magazineService.createMagazine(data)
  
  // Record successful upload attempt
  rateLimiter.recordUploadAttempt(userId)
  
  // Revalidate cache and paths (Requirements 8.2, 8.4)
  revalidateTag('magazines') // Invalidate magazines cache
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath(`/dergi/${data.issue_number}`)
}

/**
 * Deletes a magazine and all its associated storage files
 */
export async function deleteMagazine(formData: FormData) {
  // Require admin role
  await requireAdmin()
  
  // Verify CSRF origin
  await verifyCSRFOrigin()
  
  const data = parseFormDataWithZod(formData, deleteMagazineSchema)
  
  const magazineService = await createMagazineService()
  await magazineService.deleteMagazine(data.id, data.issue_number)
  
  // Revalidate cache and paths (Requirements 8.2, 8.4)
  revalidateTag('magazines') // Invalidate magazines cache
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath(`/dergi/${data.issue_number}`)
}

/**
 * Renames a magazine by updating issue number and/or title
 * Moves all associated storage files to new paths
 */
export async function renameMagazine(formData: FormData) {
  // Require admin role
  await requireAdmin()
  
  // Verify CSRF origin
  await verifyCSRFOrigin()
  
  const data = parseFormDataWithZod(formData, renameMagazineSchema)
  
  const magazineService = await createMagazineService()
  await magazineService.renameMagazine(
    data.id,
    data.old_issue,
    data.new_issue,
    data.new_title
  )
  
  // Revalidate cache and paths (Requirements 8.2, 8.4)
  revalidateTag('magazines') // Invalidate magazines cache
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath(`/dergi/${data.old_issue}`)
  revalidatePath(`/dergi/${data.new_issue}`)
}

/**
 * Saves upload logs to storage
 * Uses SupabaseStorageService for consistent storage operations
 */
export async function saveUploadLog(issue: string, content: string) {
  const supabase = await createClient()
  const storageService = new SupabaseStorageService(supabase)
  
  const issueNumber = parseInt(issue, 10)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const path = STORAGE_PATHS.getLogsPath(issueNumber, timestamp)
  
  const data = new TextEncoder().encode(content)
  const blob = new Blob([data], { type: 'text/plain' })
  
  await storageService.upload(path, blob, {
    contentType: 'text/plain',
    upsert: true
  })
  
  return path
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
 * @param path - The storage path for the file
 * @param fileData - The file data as ArrayBuffer
 * @param contentType - The MIME type of the file
 * @returns Promise resolving to success status
 * @throws {Error} If upload fails
 */
export async function uploadFileToStorage(
  path: string,
  fileData: ArrayBuffer,
  contentType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Require admin role for file uploads
    await requireAdmin()
    
    // Verify CSRF origin
    await verifyCSRFOrigin()
    
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
    
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed'
    console.error('Server-side upload error:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

