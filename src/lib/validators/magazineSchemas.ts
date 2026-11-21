import { z } from 'zod'
import { parseLocalDateTR } from '@/lib/formatters/tr'
import { t } from '@/lib/i18n'
import { MagazineSchema, TURKISH_TITLE_REGEX, UUIDSchema } from './schemas'

/**
 * URL validation helper
 */
const httpUrl = z
  .string()
  .url('Geçerli bir bağlantı adresi girin.')
  .refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === 'http:' || protocol === 'https:'
  }, 'Bağlantı adresi http:// veya https:// ile başlamalıdır.')

const urlOrEmpty = httpUrl.optional().or(z.literal(''))

/**
 * Zod schema for magazine input validation
 */
export const MagazineInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, t('validation.titleRequired'))
    .max(200, t('validation.titleMax'))
    .regex(TURKISH_TITLE_REGEX, t('validation.titleCharset')),

  issue_number: z
    .number()
    .int(t('validation.issueRange'))
    .positive(t('validation.issueRange'))
    .max(9999, t('validation.issueRange')),

  publication_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.dateFormat'))
    .refine((date) => parseLocalDateTR(date) !== null, t('validation.dateInvalid')),

  pdf_url: urlOrEmpty,

  cover_image_url: urlOrEmpty,

  page_count: z
    .number()
    .int('Sayfa sayısı tam sayı olmalıdır.')
    .positive('Sayfa sayısı pozitif bir tam sayı olmalıdır.')
    .max(1000, 'Sayfa sayısı en fazla 1000 olabilir.')
    .nullable()
    .optional(),
})

/**
 * Zod schema for magazine rename operations
 * Includes version field for optimistic locking
 */
export const MagazineRenameSchema = z.object({
  id: z.string().uuid('Geçersiz kayıt kimliği.'),
  old_issue: z.number().int().positive(t('validation.issueRange')),
  new_issue: z.number().int().positive(t('validation.issueRange')).max(9999, t('validation.issueRange')),
  new_title: z
    .string()
    .trim()
    .min(1, t('validation.titleRequired'))
    .max(200, t('validation.titleMax'))
    .regex(TURKISH_TITLE_REGEX, t('validation.titleCharset'))
    .optional(),
  version: z.number().int().nonnegative('Sürüm numarası negatif olamaz.'),
})

/**
 * Zod schema for magazine delete operations
 */
export const MagazineDeleteSchema = z.object({
  id: z.string().uuid('Geçersiz kayıt kimliği.'),
  issue_number: z.number().int().positive(t('validation.issueRange')),
})

/**
 * Legacy schema for creating a new magazine
 */
export const createMagazineSchema = MagazineSchema.extend({
  cover_image_url: httpUrl.optional().or(z.literal('')),
  pdf_url: httpUrl.optional().or(z.literal('')),
  page_count: z
    .number()
    .int('Sayfa sayısı tam sayı olmalıdır.')
    .positive('Sayfa sayısı pozitif bir tam sayı olmalıdır.')
    .optional(),
  is_published: z.boolean().default(true),
})

/**
 * Legacy schema for updating an existing magazine
 */
export const updateMagazineSchema = MagazineSchema.partial().extend({
  cover_image_url: httpUrl.optional().or(z.literal('')),
  pdf_url: httpUrl.optional().or(z.literal('')),
  page_count: z
    .number()
    .int('Sayfa sayısı tam sayı olmalıdır.')
    .positive('Sayfa sayısı pozitif bir tam sayı olmalıdır.')
    .optional(),
  is_published: z.boolean().optional(),
})

/**
 * Legacy schema for deleting a magazine
 */
export const deleteMagazineSchema = z.object({
  id: UUIDSchema,
  issue_number: z.number().int().positive(t('validation.issueRange')),
})

/**
 * Legacy schema for renaming/moving a magazine
 */
export const renameMagazineSchema = z.object({
  id: UUIDSchema,
  old_issue: z.number().int().positive(t('validation.issueRange')),
  new_issue: z.number().int().positive(t('validation.issueRange')).max(9999, t('validation.issueRange')),
  new_title: z
    .string()
    .trim()
    .min(1, t('validation.titleRequired'))
    .max(200, t('validation.titleMax'))
    .regex(TURKISH_TITLE_REGEX, t('validation.titleCharset'))
    .optional(),
})

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, t('validation.emailInvalid'))
    .email(t('validation.emailInvalid')),
  password: z
    .string()
    .min(1, t('validation.passwordRequired'))
    .min(6, t('validation.passwordMin')),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, t('validation.passwordRequired')),
  newPassword: z.string().min(6, t('validation.passwordMin')),
})

export type MagazineInput = z.infer<typeof MagazineInputSchema>
export type MagazineRenameInput = z.infer<typeof MagazineRenameSchema>
export type MagazineDeleteInput = z.infer<typeof MagazineDeleteSchema>

export type CreateMagazineDto = z.infer<typeof createMagazineSchema>
export type UpdateMagazineDto = z.infer<typeof updateMagazineSchema>
export type DeleteMagazineDto = z.infer<typeof deleteMagazineSchema>
export type RenameMagazineDto = z.infer<typeof renameMagazineSchema>
export type LoginDto = z.infer<typeof loginSchema>
export type PasswordChangeDto = z.infer<typeof passwordChangeSchema>
