import { PostgrestError } from '@supabase/supabase-js'
import { 
  AppError, 
  DatabaseError, 
  StorageError, 
  ValidationError,
  AuthenticationError,
  ProcessingError 
} from './AppError'
import { ERROR_MESSAGES } from '@/lib/constants/errorMessages'
import { ERROR_CATALOG, getErrorEntry } from '@/lib/constants/errorCatalog'
import { categorizeError, showError } from '@/lib/utils/uploadErrors'

/**
 * Result type for operations that can succeed or fail
 * Provides type-safe discriminated union for error handling
 */
export interface SuccessResponse<T> {
  success: true
  data: T
}

export interface ErrorResponse<E = unknown> {
  success: false
  error: {
    code: string
    message: string
    userMessage: string
    details?: E
  }
}

export type Result<T, E = unknown> = SuccessResponse<T> | ErrorResponse<E>

/**
 * Error severity levels for classification
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * ErrorHandler class provides centralized error handling functionality
 * Transforms various error types into typed AppError instances
 * Provides error classification, user message generation, and Result helpers
 */
export class ErrorHandler {
  /**
   * Handles Supabase database errors and converts them to typed DatabaseError
   * Maps specific Postgres error codes to user-friendly messages using error catalog
   * @param error - The Supabase PostgrestError
   * @param operation - The database operation being performed
   * @param table - Optional table name for context
   * @returns DatabaseError instance
   */
  static handleSupabaseError(
    error: PostgrestError,
    operation: 'select' | 'insert' | 'update' | 'delete' = 'select',
    table?: string
  ): DatabaseError {
    let errorCode = 'DATABASE_GENERIC_ERROR'
    const technicalMessage: string = error.message
    
    // Map Postgres error codes to catalog error codes
    if (error.code === 'PGRST116') {
      errorCode = 'DATABASE_NOT_FOUND'
    } else if (error.code === '23505') {
      errorCode = 'DATABASE_DUPLICATE_ENTRY'
    } else if (error.code === '23503') {
      // Foreign key violation
      errorCode = 'DATABASE_CONSTRAINT_VIOLATION'
    } else if (error.code === '23502') {
      // Not null violation
      errorCode = 'VALIDATION_MISSING_FIELDS'
    } else if (error.code === '08006' || error.code === '08003') {
      // Connection failure
      errorCode = 'DATABASE_CONNECTION_FAILED'
    } else if (error.code === '57014') {
      // Query timeout
      errorCode = 'DATABASE_QUERY_TIMEOUT'
    } else {
      // Map operation-specific error codes
      switch (operation) {
        case 'select':
          errorCode = 'DATABASE_FETCH_FAILED'
          break
        case 'insert':
          errorCode = 'DATABASE_CREATE_FAILED'
          break
        case 'update':
          errorCode = 'DATABASE_UPDATE_FAILED'
          break
        case 'delete':
          errorCode = 'DATABASE_DELETE_FAILED'
          break
      }
    }
    
    // Get error details from catalog
    const catalogEntry = getErrorEntry(errorCode)
    
    return new DatabaseError(
      technicalMessage,
      operation,
      table,
      catalogEntry.userMessage,
      catalogEntry.isRetryable,
      error,
      errorCode
    )
  }

  /**
   * Handles Supabase storage errors and converts them to typed StorageError
   * Provides context-aware error messages based on operation type using error catalog
   * 
   * Enhanced with context-aware messaging (Requirement 4.4):
   * - Reflects operation type in message
   * - Includes file name when available
   * - Provides actionable guidance based on context
   * 
   * @param error - The Supabase storage error
   * @param operation - The storage operation being performed
   * @param path - Optional file path for context
   * @returns StorageError instance with context-aware message
   */
  static handleStorageError(
    error: Error | { message: string },
    operation: 'upload' | 'download' | 'delete' | 'list' | 'move' = 'upload',
    path?: string
  ): StorageError {
    const errorMessage = error instanceof Error ? error.message : error.message
    let errorCode = 'STORAGE_UPLOAD_FAILED'
    
    // Parse error message for specific conditions
    if (errorMessage.toLowerCase().includes('not found')) {
      errorCode = 'STORAGE_FILE_NOT_FOUND'
    } else if (errorMessage.toLowerCase().includes('bucket')) {
      errorCode = 'STORAGE_BUCKET_NOT_FOUND'
    } else if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('unauthorized')) {
      errorCode = 'STORAGE_PERMISSION_DENIED'
    } else if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit')) {
      errorCode = 'STORAGE_QUOTA_EXCEEDED'
    } else if (errorMessage.toLowerCase().includes('timeout')) {
      errorCode = 'PROCESSING_TIMEOUT'
    } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
      errorCode = 'NETWORK_CONNECTION_FAILED'
    } else {
      // Map operation-specific error codes
      switch (operation) {
        case 'upload':
          errorCode = 'STORAGE_UPLOAD_FAILED'
          break
        case 'delete':
          errorCode = 'STORAGE_DELETE_FAILED'
          break
        case 'list':
          errorCode = 'STORAGE_LIST_FAILED'
          break
        case 'move':
          errorCode = 'STORAGE_MOVE_FAILED'
          break
        case 'download':
          errorCode = 'STORAGE_DOWNLOAD_FAILED'
          break
      }
    }
    
    // Get error details from catalog
    const catalogEntry = getErrorEntry(errorCode)
    
    // Create context-aware user message
    const contextAwareMessage = this.createContextAwareStorageMessage(
      catalogEntry.userMessage,
      operation,
      path
    )
    
    return new StorageError(
      errorMessage,
      operation,
      path,
      contextAwareMessage,
      catalogEntry.isRetryable,
      error,
      errorCode
    )
  }

  /**
   * Gets context-specific recovery actions for storage errors
   * Provides file-specific guidance based on operation type
   * These actions complement the catalog actions with specific file context
   * 
   * @param error - The StorageError instance
   * @returns Array of context-specific recovery actions
   */
  private static getStorageContextActions(error: StorageError): string[] {
    const actions: string[] = []
    
    // Only add context-specific actions if we have a file name
    if (!error.fileName) {
      return actions
    }
    
    switch (error.operation) {
      case 'upload':
        // Add file format validation hint
        actions.push(`"${error.fileName}" dosyasının geçerli bir format olduğundan emin olun`)
        break
      case 'download':
        // Catalog already has "Dosyanın mevcut olduğundan emin olun"
        // Add specific file name version only if it adds value
        if (!error.code || error.code !== 'STORAGE_FILE_NOT_FOUND') {
          actions.push(`"${error.fileName}" dosyasının erişilebilir olduğundan emin olun`)
        }
        break
      case 'delete':
        // Catalog already has generic "Dosyanın var olduğundan emin olun"
        // Skip to avoid duplication
        break
      case 'move':
        // Catalog already has "Dosya adının geçerli olduğundan emin olun"
        // Skip to avoid duplication
        break
      case 'list':
        // Add specific folder context
        actions.push(`"${error.fileName}" klasörüne erişim izniniz olduğundan emin olun`)
        break
    }
    
    return actions
  }

  /**
   * Creates a context-aware storage error message
   * Enhances the base message with operation type and file context
   * 
   * @param baseMessage - The base error message from catalog
   * @param operation - The storage operation type
   * @param path - Optional file path
   * @returns Context-aware error message
   */
  private static createContextAwareStorageMessage(
    baseMessage: string,
    operation: 'upload' | 'download' | 'delete' | 'list' | 'move',
    path?: string
  ): string {
    // Extract file name from path if available
    let fileName: string | undefined
    if (path) {
      const pathParts = path.split('/')
      fileName = pathParts[pathParts.length - 1]
    }

    // Create context-aware message based on operation and file name
    if (fileName) {
      switch (operation) {
        case 'upload':
          return `"${fileName}" dosyası yüklenemedi.`
        case 'download':
          return `"${fileName}" dosyası indirilemedi.`
        case 'delete':
          return `"${fileName}" dosyası silinemedi.`
        case 'move':
          return `"${fileName}" dosyası taşınamadı.`
        case 'list':
          // For list operations, path is usually a directory
          return `"${fileName}" klasöründeki dosyalar listelenemedi.`
      }
    }

    // If no file name, use operation-specific message
    switch (operation) {
      case 'upload':
        return 'Dosya yüklenemedi.'
      case 'download':
        return 'Dosya indirilemedi.'
      case 'delete':
        return path ? 'Dosyalar silinemedi.' : 'Dosya silinemedi.'
      case 'move':
        return 'Dosya taşınamadı.'
      case 'list':
        return 'Dosyalar listelenemedi.'
      default:
        return baseMessage
    }
  }

  /**
   * Handles unknown errors and converts them to typed AppError
   * Safely wraps any error type into the AppError hierarchy using error catalog
   * @param error - The unknown error
   * @returns AppError or its subclass
   */
  static handleUnknownError(error: unknown): AppError {
    // If it's already an AppError, return it as-is
    if (error instanceof AppError) {
      return error
    }
    
    const errorCode = 'GENERAL_UNKNOWN_ERROR'
    const catalogEntry = getErrorEntry(errorCode)
    
    // If it's a standard Error, wrap it
    if (error instanceof Error) {
      return new AppError(
        error.message,
        errorCode,
        500,
        catalogEntry.userMessage,
        catalogEntry.isRetryable,
        error
      )
    }
    
    // For completely unknown types, create a generic error
    return new AppError(
      String(error),
      errorCode,
      500,
      catalogEntry.userMessage,
      catalogEntry.isRetryable,
      error
    )
  }

  /**
   * Determines if an error is retryable based on its type and properties
   * @param error - The error to check
   * @returns True if the error should be retried
   */
  static isRetryable(error: AppError): boolean {
    return error.isRetryable
  }

  /**
   * Determines the severity level of an error
   * Used for logging, alerting, and prioritization
   * @param error - The error to classify
   * @returns Severity level
   */
  static getSeverity(error: AppError): ErrorSeverity {
    // Critical errors
    if (error instanceof DatabaseError && !error.isRetryable) {
      return 'critical'
    }
    
    if (error instanceof AuthenticationError && error.reason === 'unauthorized') {
      return 'high'
    }
    
    // High severity errors
    if (error instanceof StorageError && error.operation === 'delete') {
      return 'high'
    }
    
    if (error instanceof ValidationError) {
      return 'low'
    }
    
    // Medium severity for retryable errors
    if (error.isRetryable) {
      return 'medium'
    }
    
    // Default to high for non-retryable errors
    return 'high'
  }

  /**
   * Gets user-friendly error message
   * Returns the userMessage field which is safe to display to end users
   * @param error - The error to get message from
   * @returns User-friendly error message
   */
  static getUserMessage(error: AppError): string {
    return error.userMessage
  }

  /**
   * Gets recovery actions for an error
   * Provides actionable guidance to users on how to resolve the error
   * Uses error catalog when available, enhanced with context-specific actions
   * @param error - The error to get recovery actions for
   * @returns Array of recovery action strings
   */
  static getRecoveryActions(error: AppError): string[] {
    const actions: string[] = []
    
    // Get base actions from error catalog if available
    if (error.code && ERROR_CATALOG[error.code]) {
      actions.push(...ERROR_CATALOG[error.code].recoveryActions)
    }
    
    // Add context-specific actions for StorageError
    if (error instanceof StorageError) {
      const contextActions = this.getStorageContextActions(error)
      // Add context actions that aren't already in the list
      contextActions.forEach(action => {
        if (!actions.includes(action)) {
          actions.push(action)
        }
      })
      
      // If we have context actions, return early
      if (actions.length > 0) {
        return actions
      }
    }
    
    // If we already have actions from catalog, return them
    if (actions.length > 0) {
      return actions
    }
    
    // Fallback to type-specific actions if no catalog entry
    
    // Retryable errors
    if (error.isRetryable) {
      actions.push('İşlemi tekrar deneyin')
    }
    
    // Specific error type actions
    if (error instanceof ValidationError) {
      actions.push(`${error.field} alanını kontrol edin`)
      actions.push('Geçerli bir değer girin')
    } else if (error instanceof AuthenticationError) {
      if (error.reason === 'session_expired') {
        actions.push('Tekrar giriş yapın')
      } else if (error.reason === 'invalid_credentials') {
        actions.push('Kullanıcı adı ve şifrenizi kontrol edin')
      } else {
        actions.push('Yönetici ile iletişime geçin')
      }
    } else if (error instanceof DatabaseError) {
      if (error.isRetryable) {
        actions.push('Birkaç saniye bekleyip tekrar deneyin')
      } else {
        actions.push('Destek ekibi ile iletişime geçin')
      }
    } else if (error instanceof ProcessingError) {
      actions.push('Dosya formatını kontrol edin')
      actions.push('Farklı bir dosya deneyin')
    }
    
    // Generic fallback
    if (actions.length === 0) {
      actions.push('Sayfayı yenileyin')
      actions.push('Sorun devam ederse destek ekibi ile iletişime geçin')
    }
    
    return actions
  }

  /**
   * Creates a success Result
   * @param data - The success data
   * @returns SuccessResponse
   */
  static success<T>(data: T): SuccessResponse<T> {
    return {
      success: true,
      data
    }
  }

  /**
   * Creates a failure Result from an AppError
   * @param error - The AppError instance
   * @param details - Optional additional details
   * @returns ErrorResponse
   */
  static failure<E = unknown>(error: AppError, details?: E): ErrorResponse<E> {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
        details
      }
    }
  }
}

// Legacy function exports for backward compatibility
// These maintain the existing API while delegating to ErrorHandler class

/**
 * @deprecated Use ErrorHandler.handleSupabaseError instead
 */
export function handleSupabaseError(error: PostgrestError): never {
  throw ErrorHandler.handleSupabaseError(error)
}

/**
 * @deprecated Use ErrorHandler.handleStorageError instead
 */
export function handleStorageError(error: { message: string } | Error): never {
  throw ErrorHandler.handleStorageError(error)
}

/**
 * @deprecated Use ErrorHandler.handleUnknownError instead
 */
export function handleUnknownError(error: unknown): never {
  throw ErrorHandler.handleUnknownError(error)
}

/**
 * Handles upload errors with user-friendly logging
 * Used in upload dialogs to provide feedback to users
 * @param error - The error that occurred during upload
 * @param logger - Function to log messages to the UI
 * @param onRetry - Optional retry callback
 */
export function handleUploadError(
  error: unknown, 
  logger: (msg: string) => void,
  onRetry?: () => void
): void {
  const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR
  logger(`Hata: ${errorMessage}`)
  
  // Categorize error and show user-friendly toast notification
  const categorizedError = categorizeError(error)
  showError(categorizedError, onRetry)
}

/**
 * Safely extracts error message from unknown error types
 * @param error - The error to extract message from
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR
}

/**
 * Checks if an error is a specific type of AppError
 * @param error - The error to check
 * @param errorClass - The error class to check against
 * @returns True if error is instance of errorClass
 */
export function isErrorType<T extends AppError>(
  error: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorClass: new (...args: any[]) => T
): error is T {
  return error instanceof errorClass
}
