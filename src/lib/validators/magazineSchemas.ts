import { z } from 'zod'
import { ERROR_MESSAGES } from '@/lib/constants/errorMessages'
import { MagazineSchema, UUIDSchema } from './schemas'

/**
 * Zod schema for creating a new magazine
 * Validates all required fields for magazine creation
 * 
 * Requirements:
 * - 4.1: Validate magazine metadata against Zod schema
 * - 4.2: Title 1-200 chars, alphanumeric + spaces/hyphens/punctuation
 * - 4.3: Issue number positive integer, max 9999
 * - 4.4: Publication date in ISO 8601 format (YYYY-MM-DD)
 */
export const createMagazineSchema = MagazineSchema.extend({
  cover_image_url: z.string().url().optional().or(z.literal('')),
  pdf_url: z.string().url().optional().or(z.literal('')),
  page_count: z.number().int().positive().optional(),
  is_published: z.boolean().default(true)
})

/**
 * Zod schema for updating an existing magazine
 * All fields are optional to allow partial updates
 * 
 * Requirements:
 * - 4.1: Validate magazine metadata against Zod schema
 * - 4.2: Title 1-200 chars, alphanumeric + spaces/hyphens/punctuation
 * - 4.3: Issue number positive integer, max 9999
 * - 4.4: Publication date in ISO 8601 format (YYYY-MM-DD)
 */
export const updateMagazineSchema = MagazineSchema.partial().extend({
  cover_image_url: z.string().url().optional().or(z.literal('')),
  pdf_url: z.string().url().optional().or(z.literal('')),
  page_count: z.number().int().positive().optional(),
  is_published: z.boolean().optional()
})

/**
 * Zod schema for deleting a magazine
 * Requires both ID and issue number for safety
 * 
 * Requirements:
 * - 5.1: Validate delete operation IDs as proper UUIDs
 * - 5.2: Reject operations with invalid UUIDs
 */
export const deleteMagazineSchema = z.object({
  id: UUIDSchema,
  issue_number: z.number().int().positive()
})

/**
 * Zod schema for renaming/moving a magazine
 * Handles both issue number change and title update
 * 
 * Requirements:
 * - 5.1: Validate update operation IDs as proper UUIDs
 * - 5.2: Reject operations with invalid UUIDs
 */
export const renameMagazineSchema = z.object({
  id: UUIDSchema,
  old_issue: z.number().int().positive(),
  new_issue: z.number().int().positive(),
  new_title: z.string().min(1).optional()
})

/**
 * Inferred TypeScript types from Zod schemas
 * These ensure runtime validation matches compile-time types
 */
export const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir')
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifre gereklidir'),
  newPassword: z.string().min(6, 'Yeni şifre en az 6 karakter olmalıdır')
})

export type CreateMagazineDto = z.infer<typeof createMagazineSchema>
export type UpdateMagazineDto = z.infer<typeof updateMagazineSchema>
export type DeleteMagazineDto = z.infer<typeof deleteMagazineSchema>
export type RenameMagazineDto = z.infer<typeof renameMagazineSchema>
export type LoginDto = z.infer<typeof loginSchema>
export type PasswordChangeDto = z.infer<typeof passwordChangeSchema>
