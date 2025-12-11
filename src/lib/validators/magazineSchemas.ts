import { z } from 'zod'
import { MagazineSchema, UUIDSchema } from './schemas'

/**
 * URL validation helper
 * Validates URL format and rejects invalid URLs
 * 
 * Requirements:
 * - 2.2: Validate URL format and reject invalid URLs
 */
const urlOrEmpty = z.string().url('Geçersiz URL').optional().or(z.literal(''))

/**
 * Zod schema for magazine input validation
 * Validates all fields with appropriate constraints
 * 
 * Requirements:
 * - 2.1: Validate all fields using Zod schemas with appropriate constraints
 * - 2.2: Validate URL format and reject invalid URLs
 * - 2.5: Perform runtime type validation instead of unsafe type casting
 */
export const MagazineInputSchema = z.object({
  title: z.string()
    .min(1, 'Başlık boş olamaz')
    .max(200, 'Başlık en fazla 200 karakter olabilir'),
  
  issue_number: z.number()
    .int('Sayı numarası tam sayı olmalı')
    .positive('Sayı numarası pozitif olmalı')
    .max(9999, 'Sayı numarası çok büyük'),
  
  publication_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih formatı YYYY-MM-DD olmalı')
    .refine(
      (date) => !isNaN(Date.parse(date)),
      'Geçersiz tarih'
    ),
  
  pdf_url: urlOrEmpty,
  
  cover_image_url: urlOrEmpty,
  
  page_count: z.number()
    .int('Sayfa sayısı tam sayı olmalı')
    .positive('Sayfa sayısı pozitif olmalı')
    .max(1000, 'Sayfa sayısı en fazla 1000 olabilir')
    .nullable()
    .optional()
})

/**
 * Zod schema for magazine rename operations
 * Includes version field for optimistic locking
 * 
 * Requirements:
 * - 4.1: Use optimistic locking with version fields to detect conflicts
 * - 4.2: Reject operations with version conflicts
 */
export const MagazineRenameSchema = z.object({
  id: z.string().uuid('Geçersiz ID formatı'),
  old_issue: z.number().int().positive(),
  new_issue: z.number().int().positive(),
  new_title: z.string()
    .min(1)
    .max(200)
    .optional(),
  version: z.number().int().nonnegative()
})

/**
 * Zod schema for magazine delete operations
 * Requires both ID and issue number for safety
 * 
 * Requirements:
 * - 2.1: Validate all fields using Zod schemas
 */
export const MagazineDeleteSchema = z.object({
  id: z.string().uuid('Geçersiz ID formatı'),
  issue_number: z.number().int().positive()
})

/**
 * Legacy schema for creating a new magazine
 * Validates all required fields for magazine creation
 * 
 * Requirements:
 * - 4.1: Validate magazine metadata against Zod schema
 * - 4.2: Title 1-200 chars, alphanumeric + spaces/hyphens/punctuation
 * - 4.3: Issue number positive integer, max 9999
 * - 4.4: Publication date in ISO 8601 format (YYYY-MM-DD)
 */
export const createMagazineSchema = MagazineSchema.extend({
  cover_image_url: z.string().url('Kapak resmi geçerli bir URL olmalıdır. Lütfen http:// veya https:// ile başlayan bir adres girin.').optional().or(z.literal('')),
  pdf_url: z.string().url('PDF adresi geçerli bir URL olmalıdır. Lütfen http:// veya https:// ile başlayan bir adres girin.').optional().or(z.literal('')),
  page_count: z.number().int('Sayfa sayısı tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.').positive('Sayfa sayısı pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.').optional(),
  is_published: z.boolean().default(true)
})

/**
 * Legacy schema for updating an existing magazine
 * All fields are optional to allow partial updates
 * 
 * Requirements:
 * - 4.1: Validate magazine metadata against Zod schema
 * - 4.2: Title 1-200 chars, alphanumeric + spaces/hyphens/punctuation
 * - 4.3: Issue number positive integer, max 9999
 * - 4.4: Publication date in ISO 8601 format (YYYY-MM-DD)
 */
export const updateMagazineSchema = MagazineSchema.partial().extend({
  cover_image_url: z.string().url('Kapak resmi geçerli bir URL olmalıdır. Lütfen http:// veya https:// ile başlayan bir adres girin.').optional().or(z.literal('')),
  pdf_url: z.string().url('PDF adresi geçerli bir URL olmalıdır. Lütfen http:// veya https:// ile başlayan bir adres girin.').optional().or(z.literal('')),
  page_count: z.number().int('Sayfa sayısı tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.').positive('Sayfa sayısı pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.').optional(),
  is_published: z.boolean().optional()
})

/**
 * Legacy schema for deleting a magazine
 * Requires both ID and issue number for safety
 * 
 * Requirements:
 * - 5.1: Validate delete operation IDs as proper UUIDs
 * - 5.2: Reject operations with invalid UUIDs
 */
export const deleteMagazineSchema = z.object({
  id: UUIDSchema,
  issue_number: z.number().int('Sayı numarası tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.').positive('Sayı numarası pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.')
})

/**
 * Legacy schema for renaming/moving a magazine
 * Handles both issue number change and title update
 * 
 * Requirements:
 * - 5.1: Validate update operation IDs as proper UUIDs
 * - 5.2: Reject operations with invalid UUIDs
 */
export const renameMagazineSchema = z.object({
  id: UUIDSchema,
  old_issue: z.number().int('Eski sayı numarası tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.').positive('Eski sayı numarası pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.'),
  new_issue: z.number().int('Yeni sayı numarası tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.').positive('Yeni sayı numarası pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.'),
  new_title: z.string().min(1, 'Yeni başlık boş olamaz. Lütfen bir başlık girin.').optional()
})

/**
 * Inferred TypeScript types from Zod schemas
 * These ensure runtime validation matches compile-time types
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-posta adresi gereklidir')
    .email('Geçerli bir e-posta adresi girin'),
  password: z
    .string()
    .min(1, 'Şifre gereklidir')
    .min(6, 'Şifre en az 6 karakter olmalıdır')
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifre gereklidir'),
  newPassword: z.string().min(6, 'Yeni şifre en az 6 karakter olmalıdır')
})

/**
 * Inferred TypeScript types from Zod schemas
 * These ensure runtime validation matches compile-time types
 */
export type MagazineInput = z.infer<typeof MagazineInputSchema>
export type MagazineRenameInput = z.infer<typeof MagazineRenameSchema>
export type MagazineDeleteInput = z.infer<typeof MagazineDeleteSchema>

// Legacy types for backward compatibility
export type CreateMagazineDto = z.infer<typeof createMagazineSchema>
export type UpdateMagazineDto = z.infer<typeof updateMagazineSchema>
export type DeleteMagazineDto = z.infer<typeof deleteMagazineSchema>
export type RenameMagazineDto = z.infer<typeof renameMagazineSchema>
export type LoginDto = z.infer<typeof loginSchema>
export type PasswordChangeDto = z.infer<typeof passwordChangeSchema>
