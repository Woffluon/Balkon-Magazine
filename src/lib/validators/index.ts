/**
 * Validation Layer
 * 
 * This module provides Zod schemas and utilities for validating data
 * throughout the application. All validation logic should be centralized here.
 */

// Export schemas
export {
  MagazineInputSchema,
  MagazineRenameSchema,
  MagazineDeleteSchema,
  createMagazineSchema,
  updateMagazineSchema,
  deleteMagazineSchema,
  renameMagazineSchema,
  loginSchema,
  passwordChangeSchema
} from './magazineSchemas'

// Export DTO types
export type {
  MagazineInput,
  MagazineRenameInput,
  MagazineDeleteInput,
  CreateMagazineDto,
  UpdateMagazineDto,
  DeleteMagazineDto,
  RenameMagazineDto,
  LoginDto,
  PasswordChangeDto
} from './magazineSchemas'

// Export URL validation
export {
  URLSchema,
  OptionalURLSchema,
  isValidURL,
  isValidOptionalURL,
  validateURL,
  validatePageNumber
} from './urlValidation'

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
