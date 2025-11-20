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
  await requireAuth()
  
  const data = parseFormDataWithZod(formData, createMagazineSchema)
  
  const magazineService = await createMagazineService()
  await magazineService.createMagazine(data)
  
  revalidatePath('/admin')
}

/**
 * Deletes a magazine and all its associated storage files
 */
export async function deleteMagazine(formData: FormData) {
  await requireAuth()
  
  const data = parseFormDataWithZod(formData, deleteMagazineSchema)
  
  const magazineService = await createMagazineService()
  await magazineService.deleteMagazine(data.id, data.issue_number)
  
  revalidatePath('/admin')
}

/**
 * Renames a magazine by updating issue number and/or title
 * Moves all associated storage files to new paths
 */
export async function renameMagazine(formData: FormData) {
  await requireAuth()
  
  const data = parseFormDataWithZod(formData, renameMagazineSchema)
  
  const magazineService = await createMagazineService()
  await magazineService.renameMagazine(
    data.id,
    data.old_issue,
    data.new_issue,
    data.new_title
  )
  
  revalidatePath('/admin')
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

