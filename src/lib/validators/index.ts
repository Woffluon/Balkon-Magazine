/**
 * Validation Layer
 * 
 * This module provides Zod schemas and utilities for validating data
 * throughout the application. All validation logic should be centralized here.
 */

// Export schemas
export {
  createMagazineSchema,
  updateMagazineSchema,
  deleteMagazineSchema,
  renameMagazineSchema,
  loginSchema,
  passwordChangeSchema
} from './magazineSchemas'

// Export DTO types
export type {
  CreateMagazineDto,
  UpdateMagazineDto,
  DeleteMagazineDto,
  RenameMagazineDto,
  LoginDto,
  PasswordChangeDto
} from './magazineSchemas'

// Export error schemas
export {
  ErrorObjectSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
  ResultSchema,
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
  unwrapResultOr
} from './errorSchemas'

// Export error types
export type {
  ErrorObject,
  ErrorResponse,
  SuccessResponse,
  Result
} from './errorSchemas'

// Export utilities
export {
  parseFormDataWithZod,
  safeValidate
} from './formDataParser'
