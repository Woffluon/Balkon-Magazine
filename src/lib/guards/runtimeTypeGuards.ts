/**
 * Enhanced Runtime Type Guards
 * 
 * Comprehensive type guards and runtime validation helpers that provide
 * type-safe access to data from external sources with proper error handling.
 * 
 * Requirements: 7.2, 7.4
 */

import { z } from 'zod'
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
 * Generic type guard function type
 */
export type TypeGuard<T> = (value: unknown) => value is T

/**
 * Type assertion function type
 */
export type TypeAssertion<T> = (value: unknown, context?: string) => T

/**
 * Creates a type guard from a Zod schema
 * 
 * @template T - The expected type
 * @param schema - The Zod schema to use for validation
 * @returns A type guard function
 */
export function createTypeGuard<T>(schema: z.ZodSchema<T>): TypeGuard<T> {
  return (value: unknown): value is T => {
    return schema.safeParse(value).success
  }
}

/**
 * Creates a type assertion function from a Zod schema
 * 
 * @template T - The expected type
 * @param schema - The Zod schema to use for validation
 * @param typeName - Name of the type for error messages
 * @returns A type assertion function
 */
export function createTypeAssertion<T>(
  schema: z.ZodSchema<T>,
  typeName: string
): TypeAssertion<T> {
  return (value: unknown, context?: string): T => {
    const result = schema.safeParse(value)
    
    if (result.success) {
      return result.data
    }
    
    const contextStr = context ? ` in ${context}` : ''
    const errorMessage = `Expected ${typeName}${contextStr}, but validation failed: ${result.error.issues[0]?.message || 'Unknown error'}`
    
    logger.error('Type assertion failed', {
      operation: 'type_assertion',
      typeName,
      context,
      error: errorMessage,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    })
    
    throw new TypeError(errorMessage)
  }
}

/**
 * Basic type guards for primitive types
 */
export const PrimitiveGuards = {
  /**
   * Type guard for strings
   */
  isString: (value: unknown): value is string => {
    return typeof value === 'string'
  },
  
  /**
   * Type guard for non-empty strings
   */
  isNonEmptyString: (value: unknown): value is string => {
    return typeof value === 'string' && value.length > 0
  },
  
  /**
   * Type guard for numbers
   */
  isNumber: (value: unknown): value is number => {
    return typeof value === 'number' && !isNaN(value)
  },
  
  /**
   * Type guard for positive numbers
   */
  isPositiveNumber: (value: unknown): value is number => {
    return typeof value === 'number' && !isNaN(value) && value > 0
  },
  
  /**
   * Type guard for integers
   */
  isInteger: (value: unknown): value is number => {
    return typeof value === 'number' && !isNaN(value) && Number.isInteger(value)
  },
  
  /**
   * Type guard for positive integers
   */
  isPositiveInteger: (value: unknown): value is number => {
    return PrimitiveGuards.isInteger(value) && value > 0
  },
  
  /**
   * Type guard for booleans
   */
  isBoolean: (value: unknown): value is boolean => {
    return typeof value === 'boolean'
  },
  
  /**
   * Type guard for objects (not null, not array)
   */
  isObject: (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  },
  
  /**
   * Type guard for arrays
   */
  isArray: (value: unknown): value is unknown[] => {
    return Array.isArray(value)
  },
  
  /**
   * Type guard for null
   */
  isNull: (value: unknown): value is null => {
    return value === null
  },
  
  /**
   * Type guard for undefined
   */
  isUndefined: (value: unknown): value is undefined => {
    return value === undefined
  },
  
  /**
   * Type guard for null or undefined
   */
  isNullish: (value: unknown): value is null | undefined => {
    return value === null || value === undefined
  },
} as const

/**
 * Advanced type guards for common patterns
 */
export const AdvancedGuards = {
  /**
   * Type guard for UUID strings
   */
  isUUID: (value: unknown): value is string => {
    if (!PrimitiveGuards.isString(value)) return false
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  },
  
  /**
   * Type guard for URL strings
   */
  isURL: (value: unknown): value is string => {
    if (!PrimitiveGuards.isString(value)) return false
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  },
  
  /**
   * Type guard for email strings
   */
  isEmail: (value: unknown): value is string => {
    if (!PrimitiveGuards.isString(value)) return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  },
  
  /**
   * Type guard for ISO date strings (YYYY-MM-DD)
   */
  isISODate: (value: unknown): value is string => {
    if (!PrimitiveGuards.isString(value)) return false
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(value)) return false
    
    const date = new Date(value)
    return !isNaN(date.getTime())
  },
  
  /**
   * Type guard for File objects
   */
  isFile: (value: unknown): value is File => {
    return value instanceof File
  },
  
  /**
   * Type guard for FormData objects
   */
  isFormData: (value: unknown): value is FormData => {
    return value instanceof FormData
  },
  
  /**
   * Type guard for Error objects
   */
  isError: (value: unknown): value is Error => {
    return value instanceof Error
  },
  
  /**
   * Type guard for Promise objects
   */
  isPromise: <T>(value: unknown): value is Promise<T> => {
    return value instanceof Promise
  },
} as const

/**
 * Array type guards
 */
export const ArrayGuards = {
  /**
   * Creates a type guard for arrays of a specific type
   */
  isArrayOf: <T>(itemGuard: TypeGuard<T>) => {
    return (value: unknown): value is T[] => {
      return PrimitiveGuards.isArray(value) && value.every(itemGuard)
    }
  },
  
  /**
   * Type guard for string arrays
   */
  isStringArray: (value: unknown): value is string[] => {
    return ArrayGuards.isArrayOf(PrimitiveGuards.isString)(value)
  },
  
  /**
   * Type guard for number arrays
   */
  isNumberArray: (value: unknown): value is number[] => {
    return ArrayGuards.isArrayOf(PrimitiveGuards.isNumber)(value)
  },
  
  /**
   * Type guard for non-empty arrays
   */
  isNonEmptyArray: <T>(itemGuard: TypeGuard<T>) => {
    return (value: unknown): value is [T, ...T[]] => {
      return PrimitiveGuards.isArray(value) && value.length > 0 && value.every(itemGuard)
    }
  },
} as const

/**
 * Object type guards
 */
export const ObjectGuards = {
  /**
   * Type guard to check if an object has a specific property
   */
  hasProperty: <K extends string>(key: K) => {
    return <T extends Record<K, unknown>>(value: unknown): value is T => {
      return PrimitiveGuards.isObject(value) && key in value
    }
  },
  
  /**
   * Type guard to check if an object has multiple properties
   */
  hasProperties: <K extends string>(...keys: K[]) => {
    return <T extends Record<K, unknown>>(value: unknown): value is T => {
      return PrimitiveGuards.isObject(value) && keys.every(key => key in value)
    }
  },
  
  /**
   * Type guard for objects with string values
   */
  isStringRecord: (value: unknown): value is Record<string, string> => {
    return PrimitiveGuards.isObject(value) && 
           Object.values(value).every(PrimitiveGuards.isString)
  },
  
  /**
   * Type guard for objects with number values
   */
  isNumberRecord: (value: unknown): value is Record<string, number> => {
    return PrimitiveGuards.isObject(value) && 
           Object.values(value).every(PrimitiveGuards.isNumber)
  },
} as const

/**
 * Safe type casting utilities
 */
export const SafeCasting = {
  /**
   * Safely cast to string with fallback
   */
  toString: (value: unknown, fallback = ''): string => {
    if (PrimitiveGuards.isString(value)) return value
    if (PrimitiveGuards.isNumber(value)) return String(value)
    if (PrimitiveGuards.isBoolean(value)) return String(value)
    return fallback
  },
  
  /**
   * Safely cast to number with fallback
   */
  toNumber: (value: unknown, fallback = 0): number => {
    if (PrimitiveGuards.isNumber(value)) return value
    if (PrimitiveGuards.isString(value)) {
      const parsed = Number(value)
      return isNaN(parsed) ? fallback : parsed
    }
    return fallback
  },
  
  /**
   * Safely cast to integer with fallback
   */
  toInteger: (value: unknown, fallback = 0): number => {
    const numberValue = SafeCasting.toNumber(value, fallback)
    return Math.floor(numberValue)
  },
  
  /**
   * Safely cast to boolean with fallback
   */
  toBoolean: (value: unknown, fallback = false): boolean => {
    if (PrimitiveGuards.isBoolean(value)) return value
    if (PrimitiveGuards.isString(value)) {
      const lower = value.toLowerCase()
      if (lower === 'true' || lower === '1') return true
      if (lower === 'false' || lower === '0') return false
    }
    if (PrimitiveGuards.isNumber(value)) {
      return value !== 0
    }
    return fallback
  },
  
  /**
   * Safely cast to array with fallback
   */
  toArray: <T>(value: unknown, fallback: T[] = []): T[] => {
    if (PrimitiveGuards.isArray(value)) return value as T[]
    return fallback
  },
} as const

/**
 * Validation helpers that combine type guards with error handling
 */
export const ValidationHelpers = {
  /**
   * Validates and returns a value, throwing if invalid
   */
  validateOrThrow: <T>(
    value: unknown,
    guard: TypeGuard<T>,
    typeName: string,
    context?: string
  ): T => {
    if (guard(value)) {
      return value
    }
    
    const contextStr = context ? ` in ${context}` : ''
    const errorMessage = `Expected ${typeName}${contextStr}`
    
    logger.error('Type validation failed', {
      operation: 'validate_or_throw',
      typeName,
      context,
      error: errorMessage,
      receivedType: typeof value
    })
    
    throw new TypeError(errorMessage)
  },
  
  /**
   * Validates and returns a value, returning undefined if invalid
   */
  validateOrUndefined: <T>(
    value: unknown,
    guard: TypeGuard<T>,
    context?: string
  ): T | undefined => {
    if (guard(value)) {
      return value
    }
    
    if (context) {
      logger.warn('Type validation failed, returning undefined', {
        operation: 'validate_or_undefined',
        context,
        receivedType: typeof value
      })
    }
    
    return undefined
  },
  
  /**
   * Validates and returns a value, returning default if invalid
   */
  validateOrDefault: <T>(
    value: unknown,
    guard: TypeGuard<T>,
    defaultValue: T,
    context?: string
  ): T => {
    if (guard(value)) {
      return value
    }
    
    if (context) {
      logger.warn('Type validation failed, returning default', {
        operation: 'validate_or_default',
        context,
        receivedType: typeof value
      })
    }
    
    return defaultValue
  },
} as const

/**
 * Export all guards in a single object for convenience
 */
export const TypeGuards = {
  ...PrimitiveGuards,
  ...AdvancedGuards,
  ...ArrayGuards,
  ...ObjectGuards,
} as const

/**
 * Export all utilities
 */
export const RuntimeValidation = {
  TypeGuards,
  SafeCasting,
  ValidationHelpers,
  createTypeGuard,
  createTypeAssertion,
} as const