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

// Export utilities
export {
  parseFormDataWithZod,
  safeValidate
} from './formDataParser'
