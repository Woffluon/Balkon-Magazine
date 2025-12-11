import { z } from 'zod'

/**
 * FormData validation schema for magazine creation/update operations
 * Handles FormData-specific validation with proper type coercion
 * 
 * Requirements:
 * - 2.1: Validate all FormData fields using Zod schemas before processing
 * - 2.3: Validate numeric fields produce valid numbers and not NaN
 * - 2.4: Handle optional fields correctly (undefined and null values)
 */
export const MagazineFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Başlık alanı zorunludur. Lütfen bir başlık girin.')
    .max(200, 'Başlık en fazla 200 karakter olabilir. Lütfen daha kısa bir başlık girin.')
    .regex(
      /^[a-zA-Z0-9\s\-.,!?]+$/,
      'Başlık sadece harf, rakam, boşluk ve şu işaretleri içerebilir: - . , ! ? Lütfen özel karakterleri kaldırın.'
    ),
  issue_number: z
    .coerce
    .number()
    .int('Sayı numarası tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.')
    .positive('Sayı numarası pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.')
    .max(9999, 'Sayı numarası en fazla 9999 olabilir. Lütfen daha küçük bir sayı girin.')
    .refine((val) => !isNaN(val), 'Sayı numarası geçerli bir sayı olmalıdır.'),
  publication_date: z
    .string()
    .min(1, 'Yayın tarihi gereklidir.')
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Yayın tarihi YYYY-AA-GG formatında olmalıdır (örnek: 2024-01-15). Lütfen doğru formatta girin.'
    )
    .refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      'Yayın tarihi geçerli bir tarih olmalıdır. Lütfen var olan bir tarih girin.'
    ),
  pdf_url: z
    .string()
    .optional()
    .transform((val) => val === '' ? undefined : val)
    .pipe(
      z.string().url('PDF adresi geçerli bir URL olmalıdır. Lütfen http:// veya https:// ile başlayan bir adres girin.').optional()
    ),
  cover_image_url: z
    .string()
    .optional()
    .transform((val) => val === '' ? undefined : val)
    .pipe(
      z.string().url('Kapak resmi geçerli bir URL olmalıdır. Lütfen http:// veya https:// ile başlayan bir adres girin.').optional()
    ),
  page_count: z
    .coerce
    .number()
    .int('Sayfa sayısı tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.')
    .positive('Sayfa sayısı pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.')
    .refine((val) => !isNaN(val), 'Sayfa sayısı geçerli bir sayı olmalıdır.')
    .optional(),
  is_published: z
    .coerce
    .boolean()
    .default(true)
})

/**
 * FormData validation schema for magazine deletion operations
 * Requires both ID and issue number for safety
 * 
 * Requirements:
 * - 2.1: Validate all FormData fields using Zod schemas before processing
 * - 2.2: Return descriptive error messages for validation failures
 */
export const DeleteMagazineSchema = z.object({
  id: z
    .string()
    .min(1, 'Dergi ID gereklidir.')
    .uuid('Geçersiz ID formatı. ID otomatik olarak oluşturulur, lütfen değiştirmeyin.'),
  issue_number: z
    .coerce
    .number()
    .int('Sayı numarası tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.')
    .positive('Sayı numarası pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.')
    .refine((val) => !isNaN(val), 'Sayı numarası geçerli bir sayı olmalıdır.')
})

/**
 * FormData validation schema for magazine rename operations
 * Handles both issue number change and optional title update
 * Includes version field for optimistic locking
 * 
 * Requirements:
 * - 2.1: Validate all FormData fields using Zod schemas before processing
 * - 2.2: Return descriptive error messages for validation failures
 * - 2.4: Handle optional fields correctly (undefined and null values)
 * - 4.1: Use optimistic locking with version fields to detect conflicts
 */
export const RenameMagazineSchema = z.object({
  id: z
    .string()
    .min(1, 'Dergi ID gereklidir.')
    .uuid('Geçersiz ID formatı. ID otomatik olarak oluşturulur, lütfen değiştirmeyin.'),
  old_issue: z
    .coerce
    .number()
    .int('Eski sayı numarası tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.')
    .positive('Eski sayı numarası pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.')
    .refine((val) => !isNaN(val), 'Eski sayı numarası geçerli bir sayı olmalıdır.'),
  new_issue: z
    .coerce
    .number()
    .int('Yeni sayı numarası tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.')
    .positive('Yeni sayı numarası pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.')
    .refine((val) => !isNaN(val), 'Yeni sayı numarası geçerli bir sayı olmalıdır.'),
  new_title: z
    .string()
    .optional()
    .transform((val) => val === '' ? undefined : val)
    .pipe(
      z.string()
        .min(1, 'Yeni başlık boş olamaz. Lütfen bir başlık girin.')
        .max(200, 'Başlık en fazla 200 karakter olabilir. Lütfen daha kısa bir başlık girin.')
        .regex(
          /^[a-zA-Z0-9\s\-.,!?]+$/,
          'Başlık sadece harf, rakam, boşluk ve şu işaretleri içerebilir: - . , ! ? Lütfen özel karakterleri kaldırın.'
        )
        .optional()
    ),
  version: z
    .coerce
    .number()
    .int('Versiyon numarası tam sayı olmalıdır.')
    .nonnegative('Versiyon numarası negatif olamaz.')
    .refine((val) => !isNaN(val), 'Versiyon numarası geçerli bir sayı olmalıdır.')
})

/**
 * TypeScript types inferred from the FormData validation schemas
 * These ensure runtime validation matches compile-time types
 * 
 * Requirements:
 * - 2.5: Provide type-safe access to validated FormData fields
 */
export type MagazineFormData = z.infer<typeof MagazineFormSchema>
export type DeleteMagazineData = z.infer<typeof DeleteMagazineSchema>
export type RenameMagazineData = z.infer<typeof RenameMagazineSchema>