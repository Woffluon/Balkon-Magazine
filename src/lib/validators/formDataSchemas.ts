import { z } from 'zod'
import { parseLocalDateTR } from '@/lib/formatters/tr'
import { t } from '@/lib/i18n'
import { TURKISH_TITLE_REGEX } from './schemas'

const httpUrl = z
  .string()
  .url('Geçerli bir bağlantı adresi girin.')
  .refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === 'http:' || protocol === 'https:'
  }, 'Bağlantı adresi http:// veya https:// ile başlamalıdır.')

/**
 * FormData validation schema for magazine creation/update operations
 */
export const MagazineFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, t('validation.titleRequired'))
    .max(200, t('validation.titleMax'))
    .regex(TURKISH_TITLE_REGEX, t('validation.titleCharset')),
  issue_number: z
    .coerce
    .number()
    .int(t('validation.issueRange'))
    .positive(t('validation.issueRange'))
    .max(9999, t('validation.issueRange'))
    .refine((val) => !isNaN(val), t('validation.issueRange')),
  publication_date: z
    .string()
    .min(1, t('validation.dateRequired'))
    .regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.dateFormat'))
    .refine((date) => parseLocalDateTR(date) !== null, t('validation.dateInvalid')),
  pdf_url: z
    .string()
    .optional()
    .transform((inputValue) => (inputValue === '' ? undefined : inputValue))
    .pipe(httpUrl.optional()),
  cover_image_url: z
    .string()
    .optional()
    .transform((inputValue) => (inputValue === '' ? undefined : inputValue))
    .pipe(httpUrl.optional()),
  page_count: z
    .coerce
    .number()
    .int('Sayfa sayısı tam sayı olmalıdır.')
    .positive('Sayfa sayısı pozitif bir tam sayı olmalıdır.')
    .refine((val) => !isNaN(val), 'Geçerli bir sayfa sayısı girin.')
    .optional(),
  is_published: z.coerce.boolean().default(true),
})

/**
 * FormData validation schema for magazine deletion operations
 */
export const DeleteMagazineSchema = z.object({
  id: z
    .string()
    .min(1, 'Dergi kimliği zorunludur.')
    .uuid('Geçersiz kayıt kimliği.'),
  issue_number: z
    .coerce
    .number()
    .int(t('validation.issueRange'))
    .positive(t('validation.issueRange'))
    .refine((val) => !isNaN(val), t('validation.issueRange')),
})

/**
 * FormData validation schema for magazine rename operations
 * Includes version field for optimistic locking
 */
export const RenameMagazineSchema = z.object({
  id: z
    .string()
    .min(1, 'Dergi kimliği zorunludur.')
    .uuid('Geçersiz kayıt kimliği.'),
  old_issue: z
    .coerce
    .number()
    .int(t('validation.issueRange'))
    .positive(t('validation.issueRange'))
    .refine((val) => !isNaN(val), t('validation.issueRange')),
  new_issue: z
    .coerce
    .number()
    .int(t('validation.issueRange'))
    .positive(t('validation.issueRange'))
    .max(9999, t('validation.issueRange'))
    .refine((val) => !isNaN(val), t('validation.issueRange')),
  new_title: z
    .string()
    .optional()
    .transform((inputValue) => {
      const trimmed = inputValue?.trim()
      return trimmed === '' ? undefined : trimmed
    })
    .pipe(
      z
        .string()
        .min(1, t('validation.titleRequired'))
        .max(200, t('validation.titleMax'))
        .regex(TURKISH_TITLE_REGEX, t('validation.titleCharset'))
        .optional()
    ),
  version: z
    .coerce
    .number()
    .int('Sürüm numarası tam sayı olmalıdır.')
    .nonnegative('Sürüm numarası negatif olamaz.')
    .refine((val) => !isNaN(val), 'Geçerli bir sürüm numarası girin.'),
})

export type MagazineFormData = z.infer<typeof MagazineFormSchema>
export type DeleteMagazineData = z.infer<typeof DeleteMagazineSchema>
export type RenameMagazineData = z.infer<typeof RenameMagazineSchema>
