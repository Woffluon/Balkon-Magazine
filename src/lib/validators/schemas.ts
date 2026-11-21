import { z } from 'zod'
import { parseLocalDateTR } from '@/lib/formatters/tr'
import { t } from '@/lib/i18n'

/**
 * Shared title regex supporting Turkish Unicode letters, numbers, spaces, and standard punctuation.
 */
export const TURKISH_TITLE_REGEX = /^[\p{L}\p{N}\s\-.,!?():'"/]+$/u

/**
 * Magazine metadata validation schema
 */
export const MagazineSchema = z.object({
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
})

export type MagazineInput = z.infer<typeof MagazineSchema>

/**
 * UUID validation schema for database record IDs
 */
export const UUIDSchema = z
  .string()
  .uuid('Geçersiz kayıt kimliği.')

/**
 * Issue number validation schema for file path validation
 */
export const IssueNumberSchema = z
  .number()
  .int(t('validation.issueRange'))
  .positive(t('validation.issueRange'))
  .max(9999, t('validation.issueRange'))

/**
 * String-based issue number schema for path sanitization
 */
export const IssueNumberStringSchema = z
  .string()
  .regex(/^\d+$/, t('validation.issueRange'))
  .transform((val) => parseInt(val, 10))
  .pipe(IssueNumberSchema)
