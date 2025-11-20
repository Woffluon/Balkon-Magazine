import { z } from 'zod'
import { ERROR_MESSAGES } from '@/lib/constants/errorMessages'

/**
 * Zod schema for creating a new magazine
 * Validates all required fields for magazine creation
 */
export const createMagazineSchema = z.object({
  title: z.string().min(1, ERROR_MESSAGES.VALIDATION.MISSING_FIELDS),
  issue_number: z.number().int().positive(ERROR_MESSAGES.VALIDATION.INVALID_ISSUE_NUMBER),
  publication_date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    ERROR_MESSAGES.VALIDATION.INVALID_DATE
  ),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  pdf_url: z.string().url().optional().or(z.literal('')),
  page_count: z.number().int().positive().optional(),
  is_published: z.boolean().default(true)
})

/**
 * Zod schema for updating an existing magazine
 * All fields are optional to allow partial updates
 */
export const updateMagazineSchema = z.object({
  title: z.string().min(1).optional(),
  issue_number: z.number().int().positive().optional(),
  publication_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  pdf_url: z.string().url().optional().or(z.literal('')),
  page_count: z.number().int().positive().optional(),
  is_published: z.boolean().optional()
})

/**
 * Zod schema for deleting a magazine
 * Requires both ID and issue number for safety
 */
export const deleteMagazineSchema = z.object({
  id: z.string().uuid(ERROR_MESSAGES.VALIDATION.INVALID_ID),
  issue_number: z.number().int().positive()
})

/**
 * Zod schema for renaming/moving a magazine
 * Handles both issue number change and title update
 */
export const renameMagazineSchema = z.object({
  id: z.string().uuid(ERROR_MESSAGES.VALIDATION.INVALID_ID),
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
