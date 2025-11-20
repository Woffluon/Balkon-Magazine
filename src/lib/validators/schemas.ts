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
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters')
    .regex(
      /^[a-zA-Z0-9\s\-.,!?]+$/,
      'Title can only contain alphanumeric characters, spaces, hyphens, periods, commas, exclamation marks, and question marks'
    ),
  issue_number: z
    .number()
    .int('Issue number must be an integer')
    .positive('Issue number must be positive')
    .max(9999, 'Issue number must not exceed 9999'),
  publication_date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Publication date must be in YYYY-MM-DD format'
    )
    .refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      'Publication date must be a valid date'
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
  .uuid('Invalid UUID format');

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
  .int('Issue number must be an integer')
  .positive('Issue number must be positive')
  .max(9999, 'Issue number must not exceed 9999');

/**
 * String-based issue number schema for path sanitization
 * Ensures the string contains only digits
 */
export const IssueNumberStringSchema = z
  .string()
  .regex(/^\d+$/, 'Issue number must contain only digits')
  .transform((val) => parseInt(val, 10))
  .pipe(IssueNumberSchema);
