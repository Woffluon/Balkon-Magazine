/**
 * Error handling module
 * Exports all error classes and handler utilities
 */

// Error classes
export {
  AppError,
  DatabaseError,
  ValidationError,
  StorageError,
  ProcessingError,
  AuthenticationError
} from './AppError'

// Error handler utilities
export {
  handleSupabaseError,
  handleStorageError,
  handleUnknownError,
  handleUploadError,
  getErrorMessage,
  isErrorType
} from './errorHandler'

// Error messages
export { ERROR_MESSAGES } from '@/lib/constants/errorMessages'
