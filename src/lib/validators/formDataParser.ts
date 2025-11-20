import { z } from 'zod'
import { ValidationError } from '@/lib/errors/AppError'

/**
 * Parses and validates FormData using a Zod schema
 * 
 * This utility converts FormData entries to appropriate types and validates
 * them against the provided Zod schema. It handles type coercion for numbers
 * and booleans automatically.
 * 
 * @template T - The expected output type (inferred from schema)
 * @param formData - The FormData object to parse
 * @param schema - The Zod schema to validate against
 * @returns The validated and typed data
 * @throws {ValidationError} If validation fails
 * 
 * @example
 * ```typescript
 * const formData = new FormData()
 * formData.append('title', 'Test Magazine')
 * formData.append('issue_number', '1')
 * 
 * const data = parseFormDataWithZod(formData, createMagazineSchema)
 * // data is now typed as CreateMagazineDto
 * ```
 */
export function parseFormDataWithZod<T>(
  formData: FormData,
  schema: z.ZodSchema<T>
): T {
  const data: Record<string, unknown> = {}
  
  // Fields that should always remain as strings (e.g., passwords, emails, titles)
  const stringOnlyFields = ['password', 'email', 'currentPassword', 'newPassword', 'title', 'new_title']
  
  for (const [key, value] of formData.entries()) {
    // Handle File objects
    if (value instanceof File) {
      data[key] = value
      continue
    }
    
    // Convert string values to appropriate types
    if (typeof value === 'string') {
      // Keep certain fields as strings regardless of content
      if (stringOnlyFields.includes(key)) {
        data[key] = value
      }
      // Convert numeric strings to numbers
      else if (!isNaN(Number(value)) && value.trim() !== '') {
        data[key] = Number(value)
      }
      // Convert boolean strings to booleans
      else if (value === 'true' || value === 'false') {
        data[key] = value === 'true'
      }
      // Keep as string
      else {
        data[key] = value
      }
    } else {
      data[key] = value
    }
  }
  
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Extract the first error message for user-friendly feedback
      const firstError = error.issues[0]
      const fieldName = firstError.path.join('.')
      const message = firstError.message
      
      throw new ValidationError(
        fieldName ? `${fieldName}: ${message}` : message,
        { zodError: error.issues }
      )
    }
    throw error
  }
}

/**
 * Validates data against a Zod schema without throwing
 * 
 * @template T - The expected output type
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns Object with success flag and either data or error
 * 
 * @example
 * ```typescript
 * const result = safeValidate({ title: 'Test' }, createMagazineSchema)
 * if (result.success) {
 *   console.log(result.data)
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export function safeValidate<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error }
  }
}
