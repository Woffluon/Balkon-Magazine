/**
 * Validation System Index
 * 
 * Centralized exports for the enhanced validation system that provides
 * schema-based validation with consistent error messages and runtime type checking.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.4
 */

// Core validation schemas
export * from './schemas'
export {
  MagazineInputSchema,
  MagazineRenameSchema,
  MagazineDeleteSchema,
  createMagazineSchema,
  updateMagazineSchema,
  deleteMagazineSchema,
  renameMagazineSchema,
  loginSchema,
  passwordChangeSchema,
  type MagazineRenameInput,
  type MagazineDeleteInput,
  type CreateMagazineDto,
  type UpdateMagazineDto,
  type DeleteMagazineDto,
  type RenameMagazineDto,
  type LoginDto,
  type PasswordChangeDto,
} from './magazineSchemas'
export * from './formDataSchemas'
export * from './errorSchemas'
export * from './urlValidation'

// Enhanced validation helpers
export * from './validationHelpers'
export * from './formDataParser'

// Re-export commonly used validation utilities
export {
  validateWithSchema,
  validateOrThrow,
  validateOrUndefined,
  validateOrDefault,
  validateArray,
  createValidator,
  CommonValidators,
  BatchValidator,
  createBatchValidator,
  type ValidationResult,
  type ValidationErrorDetail,
} from './validationHelpers'

export {
  parseFormDataWithZod,
  safeValidate,
} from './formDataParser'

export {
  ResultSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
  VoidResultSchema,
  StringResultSchema,
  NumberResultSchema,
  BooleanResultSchema,
  validateErrorResponse,
  validateResult,
  isSuccessResponse,
  isErrorResponse,
  unwrapResult,
  unwrapResultOrUndefined,
  unwrapResultOr,
  type ErrorObject,
  type ErrorResponse,
  type SuccessResponse,
  type Result,
} from './errorSchemas'

/**
 * Validation system configuration
 */
export const VALIDATION_CONFIG = {
  /**
   * Default validation options
   */
  defaults: {
    throwOnError: false,
    logErrors: true,
    includeContext: true,
  },
  
  /**
   * Error message templates
   */
  errorMessages: {
    required: 'Bu alan zorunludur',
    invalid: 'Geçersiz değer',
    tooShort: 'Çok kısa',
    tooLong: 'Çok uzun',
    invalidFormat: 'Geçersiz format',
    outOfRange: 'Değer aralık dışında',
  },
  
  /**
   * Validation limits
   */
  limits: {
    maxStringLength: 10000,
    maxArrayLength: 1000,
    maxObjectDepth: 10,
  },
} as const

/**
 * Validation system utilities
 */
export const ValidationSystem = {
  /**
   * Check if validation is enabled
   */
  isEnabled: (): boolean => {
    return process.env.NODE_ENV !== 'production' || 
           process.env.ENABLE_VALIDATION === 'true'
  },
  
  /**
   * Get validation configuration
   */
  getConfig: () => VALIDATION_CONFIG,
  
  /**
   * Create a validation context
   */
  createContext: (operation: string, component?: string) => ({
    operation,
    component,
    timestamp: new Date().toISOString(),
  }),
} as const