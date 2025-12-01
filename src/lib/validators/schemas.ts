import { z } from 'zod';

/**
 * Magazine metadata validation schema
 * 
 * Requirements:
 * - 4.1: Validate magazine metadata against Zod schema
 * - 4.2: Title 1-200 chars, alphanumeric + spaces/hyphens/punctuation
 * - 4.3: Issue number positive integer, max 9999
 * - 4.4: Publication date in ISO 8601 format (YYYY-MM-DD)
 */
export const MagazineSchema = z.object({
  title: z
    .string()
    .min(1, 'Başlık alanı zorunludur. Lütfen bir başlık girin.')
    .max(200, 'Başlık en fazla 200 karakter olabilir. Lütfen daha kısa bir başlık girin.')
    .regex(
      /^[a-zA-Z0-9\s\-.,!?]+$/,
      'Başlık sadece harf, rakam, boşluk ve şu işaretleri içerebilir: - . , ! ? Lütfen özel karakterleri kaldırın.'
    ),
  issue_number: z
    .number()
    .int('Sayı numarası tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.')
    .positive('Sayı numarası pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.')
    .max(9999, 'Sayı numarası en fazla 9999 olabilir. Lütfen daha küçük bir sayı girin.'),
  publication_date: z
    .string()
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
});

export type MagazineInput = z.infer<typeof MagazineSchema>;

/**
 * UUID validation schema for database record IDs
 * 
 * Requirements:
 * - 5.1: Validate delete operation IDs as proper UUIDs
 * - 5.2: Validate update operation IDs as proper UUIDs
 * - 5.3: Reject operations with invalid UUIDs
 */
export const UUIDSchema = z
  .string()
  .uuid('Geçersiz ID formatı. ID otomatik olarak oluşturulur, lütfen değiştirmeyin.');

/**
 * Issue number validation schema for file path validation
 * 
 * Requirements:
 * - 11.1: Validate issue number contains only digits
 * - 11.2: Reject issue numbers with invalid characters (including "../")
 * - 11.3: Sanitize user-provided values before using in file paths
 */
export const IssueNumberSchema = z
  .number()
  .int('Sayı numarası tam sayı olmalıdır. Lütfen ondalık sayı kullanmayın.')
  .positive('Sayı numarası pozitif bir sayı olmalıdır. Lütfen 1 veya daha büyük bir sayı girin.')
  .max(9999, 'Sayı numarası en fazla 9999 olabilir. Lütfen daha küçük bir sayı girin.');

/**
 * String-based issue number schema for path sanitization
 * Ensures the string contains only digits
 */
export const IssueNumberStringSchema = z
  .string()
  .regex(/^\d+$/, 'Sayı numarası sadece rakamlardan oluşmalıdır. Lütfen harf veya özel karakter kullanmayın.')
  .transform((val) => parseInt(val, 10))
  .pipe(IssueNumberSchema);
