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

// Database API Error
export {
  DatabaseApiError,
  ErrorType
} from './DatabaseApiError'

// Error handler class and utilities
export {
  ErrorHandler,
  handleSupabaseError,
  handleStorageError,
  handleUnknownError,
  handleUploadError,
  getErrorMessage,
  isErrorType
} from './errorHandler'

// Result types
export type {
  Result,
  SuccessResponse,
  ErrorResponse,
  ErrorSeverity
} from './errorHandler'

// Error messages
export { ERROR_MESSAGES } from '@/lib/constants/errorMessages'

// Error catalog
export {
  ERROR_CATALOG,
  getErrorEntry,
  getErrorCodesByCategory,
  getRetryableErrorCodes,
  getErrorCodesBySeverity
} from '@/lib/constants/errorCatalog'

export type {
  ErrorMessageEntry,
  ErrorMessageCatalog
} from '@/lib/constants/errorCatalog'

// Global error handler
export {
  GlobalErrorHandler,
  globalErrorHandler
} from './GlobalErrorHandler'
