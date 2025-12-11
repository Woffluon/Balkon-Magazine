/**
 * Enhanced Validation Helpers
 * 
 * Comprehensive validation utilities that provide schema-based validation
 * with consistent error messages and runtime type checking.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.4
 */

import { z } from 'zod'
import { ValidationError } from '@/lib/errors/AppError'
// Logger interface for type safety
interface Logger {
  error: (message: string, context?: unknown) => void
  warn: (message: string, context?: unknown) => void
  info: (message: string, context?: unknown) => void
  debug: (message: string, context?: unknown) => void
}

// Conditional logger import to avoid environment validation issues in tests
let logger: Logger
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  logger = require('@/lib/services/Logger').logger as Logger
} catch {
  // Mock logger for testing environment
  logger = {
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
  }
}

/**
 * Generic validation result type
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] }

/**
 * Individual validation error details
 */
export interface ValidationErrorDetail {
  path: string
  message: string
  code: string
}

/**
 * Enhanced validation function that provides consistent error handling
 * 
 * @template T - The expected output type
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @param context - Optional context for logging
 * @returns Validation result with success flag and either data or errors
 */
export function validateWithSchema<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  context?: string
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data)
    
    if (result.success) {
      return { success: true, data: result.data }
    }
    
    // Convert Zod errors to ValidationError objects
    const errors = result.error.issues.map((zodIssue): ValidationError => {
      const fieldPath = zodIssue.path.join('.')
      const errorMessage = zodIssue.message
      const errorCode = zodIssue.code
      
      return new ValidationError(
        `Validation failed for field '${fieldPath}': ${errorCode} - ${errorMessage}`,
        fieldPath || 'unknown',
        errorCode,
        errorMessage,
        { zodIssue }
      )
    })
    
    // Log validation failure for debugging
    if (context) {
      logger.warn('Schema validation failed', {
        operation: 'validate_with_schema',
        context,
        errorCount: errors.length,
        errors: errors.map(validationError => ({ path: validationError.field, code: validationError.code, message: validationError.userMessage }))
      })
    }
    
    return { success: false, errors }
  } catch (error) {
    // Handle unexpected errors during validation
    const validationError = new ValidationError(
      `Unexpected validation error: ${error instanceof Error ? error.message : String(error)}`,
      'unknown',
      'VALIDATION_ERROR',
      'Doğrulama sırasında beklenmeyen bir hata oluştu',
      { originalError: error }
    )
    
    logger.error('Unexpected validation error', {
      operation: 'validate_with_schema',
      context,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return { success: false, errors: [validationError] }
  }
}

/**
 * Validates data and throws on failure (for cases where you want to fail fast)
 * 
 * @template T - The expected output type
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @param context - Optional context for error messages
 * @returns The validated data
 * @throws ValidationError if validation fails
 */
export function validateOrThrow<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  context?: string
): T {
  const result = validateWithSchema(data, schema, context)
  
  if (result.success) {
    return result.data
  }
  
  // Throw the first validation error
  throw result.errors[0]
}

/**
 * Validates data and returns undefined on failure (for optional validation)
 * 
 * @template T - The expected output type
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @param context - Optional context for logging
 * @returns The validated data or undefined if validation fails
 */
export function validateOrUndefined<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  context?: string
): T | undefined {
  const result = validateWithSchema(data, schema, context)
  return result.success ? result.data : undefined
}

/**
 * Validates data and returns a default value on failure
 * 
 * @template T - The expected output type
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @param defaultValue - The default value to return on validation failure
 * @param context - Optional context for logging
 * @returns The validated data or the default value
 */
export function validateOrDefault<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  defaultValue: T,
  context?: string
): T {
  const result = validateWithSchema(data, schema, context)
  return result.success ? result.data : defaultValue
}

/**
 * Validates an array of items using a schema
 * 
 * @template T - The expected item type
 * @param items - The array to validate
 * @param itemSchema - The schema for individual items
 * @param context - Optional context for logging
 * @returns Validation result with valid items and any errors
 */
export function validateArray<T>(
  items: unknown[],
  itemSchema: z.ZodSchema<T>,
  context?: string
): { validItems: T[]; errors: ValidationError[] } {
  const validItems: T[] = []
  const errors: ValidationError[] = []
  
  items.forEach((arrayItem, itemIndex) => {
    const validationResult = validateWithSchema(arrayItem, itemSchema, `${context}[${itemIndex}]`)
    
    if (validationResult.success) {
      validItems.push(validationResult.data)
    } else {
      errors.push(...validationResult.errors)
    }
  })
  
  return { validItems, errors }
}

/**
 * Creates a validation function for a specific schema (curried validation)
 * 
 * @template T - The expected output type
 * @param schema - The Zod schema to validate against
 * @param context - Optional context for all validations
 * @returns A validation function for the schema
 */
export function createValidator<T>(
  schema: z.ZodSchema<T>,
  context?: string
) {
  return {
    validate: (data: unknown) => validateWithSchema(data, schema, context),
    validateOrThrow: (data: unknown) => validateOrThrow(data, schema, context),
    validateOrUndefined: (data: unknown) => validateOrUndefined(data, schema, context),
    validateOrDefault: (data: unknown, defaultValue: T) => validateOrDefault(data, schema, defaultValue, context),
  }
}

/**
 * Validation utilities for common data types
 */
export const CommonValidators = {
  /**
   * Validates a string is not empty
   */
  nonEmptyString: createValidator(
    z.string().min(1, 'Bu alan boş olamaz'),
    'non_empty_string'
  ),
  
  /**
   * Validates a positive integer
   */
  positiveInteger: createValidator(
    z.number().int('Tam sayı olmalıdır').positive('Pozitif bir sayı olmalıdır'),
    'positive_integer'
  ),
  
  /**
   * Validates a UUID string
   */
  uuid: createValidator(
    z.string().uuid('Geçersiz UUID formatı'),
    'uuid'
  ),
  
  /**
   * Validates a URL string
   */
  url: createValidator(
    z.string().url('Geçersiz URL formatı'),
    'url'
  ),
  
  /**
   * Validates an email address
   */
  email: createValidator(
    z.string().email('Geçersiz e-posta adresi'),
    'email'
  ),
  
  /**
   * Validates a date string in ISO format
   */
  isoDate: createValidator(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD formatında olmalıdır'),
    'iso_date'
  ),
  
  /**
   * Validates a file size is within limits
   */
  fileSize: (maxSize: number) => createValidator(
    z.number().max(maxSize, `Dosya boyutu ${maxSize} bayttan küçük olmalıdır`),
    'file_size'
  ),
  
  /**
   * Validates a number is within a range
   */
  numberRange: (min: number, max: number) => createValidator(
    z.number().min(min, `En az ${min} olmalıdır`).max(max, `En fazla ${max} olmalıdır`),
    'number_range'
  ),
} as const

/**
 * Batch validation utility for validating multiple values at once
 */
export class BatchValidator {
  private validations: Array<{ key: string; validation: () => ValidationResult<unknown> }> = []
  
  /**
   * Add a validation to the batch
   */
  add<T>(key: string, data: unknown, schema: z.ZodSchema<T>, context?: string): this {
    this.validations.push({
      key,
      validation: () => validateWithSchema(data, schema, context)
    })
    return this
  }
  
  /**
   * Execute all validations and return results
   */
  validate(): { success: boolean; results: Record<string, unknown>; errors: ValidationError[] } {
    const results: Record<string, unknown> = {}
    const errors: ValidationError[] = []
    
    for (const { key, validation } of this.validations) {
      const validationResult = validation()
      
      if (validationResult.success) {
        results[key] = validationResult.data
      } else {
        errors.push(...validationResult.errors)
      }
    }
    
    return {
      success: errors.length === 0,
      results,
      errors
    }
  }
  
  /**
   * Execute all validations and throw on first error
   */
  validateOrThrow(): Record<string, unknown> {
    const batchResult = this.validate()
    
    if (!batchResult.success) {
      throw batchResult.errors[0]
    }
    
    return batchResult.results
  }
}

/**
 * Helper to create a new batch validator
 */
export function createBatchValidator(): BatchValidator {
  return new BatchValidator()
}