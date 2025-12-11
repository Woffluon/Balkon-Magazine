/**
 * Database API Error Handling
 * 
 * Implements Requirements 7.3, 7.4:
 * - Error type classification for storage operations
 * - Database error inclusion in user-facing messages
 * 
 * @module DatabaseApiError
 */

import { StorageError as SupabaseStorageError } from '@supabase/storage-js'
import { PostgrestError } from '@supabase/supabase-js'

/**
 * Error type classification for database and storage operations
 */
export enum ErrorType {
  /** Input validation failed */
  VALIDATION = 'VALIDATION',
  /** Network or connection error */
  NETWORK = 'NETWORK',
  /** Permission or authorization error */
  PERMISSION = 'PERMISSION',
  /** Resource not found */
  NOT_FOUND = 'NOT_FOUND',
  /** Conflict (e.g., duplicate key, version mismatch) */
  CONFLICT = 'CONFLICT',
  /** Transaction or rollback error */
  TRANSACTION = 'TRANSACTION',
  /** Unknown or unclassified error */
  UNKNOWN = 'UNKNOWN'
}

/**
 * Enhanced error class for database and API operations
 * 
 * Provides:
 * - Error type classification (Requirement 7.3)
 * - Retryable flag logic
 * - Factory methods for Supabase errors
 * - User-friendly Turkish error messages
 */
export class DatabaseApiError extends Error {
  /**
   * Creates a new DatabaseApiError
   * 
   * @param message - Technical error message for logging
   * @param type - Error type classification
   * @param details - Additional error context
   * @param retryable - Whether the operation should be retried
   */
  constructor(
    message: string,
    public type: ErrorType,
    public details?: Record<string, unknown>,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'DatabaseApiError'
    
    // Maintain proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseApiError)
    }
  }

  /**
   * Factory method to create DatabaseApiError from Supabase database error
   * 
   * Implements Requirement 7.4: Database error inclusion
   * Maps Postgres error codes to error types and determines retryability
   * 
   * @param error - Supabase PostgrestError
   * @returns DatabaseApiError with appropriate classification
   */
  static fromSupabaseError(error: PostgrestError): DatabaseApiError {
    const message = error.message || 'Unknown database error'
    const code = error.code
    const hint = error.hint
    const details = error.details
    
    // Map Postgres error codes to error types
    // Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
    
    // Unique constraint violation (23505)
    if (code === '23505') {
      return new DatabaseApiError(
        message,
        ErrorType.CONFLICT,
        { code, hint, details, originalError: error },
        false // Not retryable - data conflict
      )
    }
    
    // Foreign key violation (23503)
    if (code === '23503') {
      return new DatabaseApiError(
        message,
        ErrorType.CONFLICT,
        { code, hint, details, originalError: error },
        false // Not retryable - referential integrity
      )
    }
    
    // Not null violation (23502)
    if (code === '23502') {
      return new DatabaseApiError(
        message,
        ErrorType.VALIDATION,
        { code, hint, details, originalError: error },
        false // Not retryable - validation error
      )
    }
    
    // Check constraint violation (23514)
    if (code === '23514') {
      return new DatabaseApiError(
        message,
        ErrorType.VALIDATION,
        { code, hint, details, originalError: error },
        false // Not retryable - validation error
      )
    }
    
    // Connection errors (08xxx)
    if (code?.startsWith('08')) {
      return new DatabaseApiError(
        message,
        ErrorType.NETWORK,
        { code, hint, details, originalError: error },
        true // Retryable - transient connection issue
      )
    }
    
    // Query timeout (57014)
    if (code === '57014') {
      return new DatabaseApiError(
        message,
        ErrorType.NETWORK,
        { code, hint, details, originalError: error },
        true // Retryable - may succeed on retry
      )
    }
    
    // Insufficient privilege (42501)
    if (code === '42501') {
      return new DatabaseApiError(
        message,
        ErrorType.PERMISSION,
        { code, hint, details, originalError: error },
        false // Not retryable - permission issue
      )
    }
    
    // Undefined table/column (42P01, 42703)
    if (code === '42P01' || code === '42703') {
      return new DatabaseApiError(
        message,
        ErrorType.NOT_FOUND,
        { code, hint, details, originalError: error },
        false // Not retryable - schema issue
      )
    }
    
    // PostgREST specific: No rows found (PGRST116)
    if (code === 'PGRST116') {
      return new DatabaseApiError(
        message,
        ErrorType.NOT_FOUND,
        { code, hint, details, originalError: error },
        false // Not retryable - resource doesn't exist
      )
    }
    
    // Default: Unknown error type
    // Check message for common patterns
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return new DatabaseApiError(
        message,
        ErrorType.NETWORK,
        { code, hint, details, originalError: error },
        true // Retryable
      )
    }
    
    if (lowerMessage.includes('connection') || lowerMessage.includes('network')) {
      return new DatabaseApiError(
        message,
        ErrorType.NETWORK,
        { code, hint, details, originalError: error },
        true // Retryable
      )
    }
    
    if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
      return new DatabaseApiError(
        message,
        ErrorType.PERMISSION,
        { code, hint, details, originalError: error },
        false // Not retryable
      )
    }
    
    if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
      return new DatabaseApiError(
        message,
        ErrorType.NOT_FOUND,
        { code, hint, details, originalError: error },
        false // Not retryable
      )
    }
    
    // Unknown error - not retryable by default for safety
    return new DatabaseApiError(
      message,
      ErrorType.UNKNOWN,
      { code, hint, details, originalError: error },
      false
    )
  }

  /**
   * Factory method to create DatabaseApiError from Supabase storage error
   * 
   * Implements Requirement 7.3: Error type classification
   * Classifies storage errors and determines retryability
   * 
   * @param error - Supabase storage error or generic Error
   * @param operation - Storage operation type for context
   * @param path - File path for context
   * @returns DatabaseApiError with appropriate classification
   */
  static fromStorageError(
    error: SupabaseStorageError | Error | { message: string },
    operation?: string,
    path?: string
  ): DatabaseApiError {
    const message = error instanceof Error ? error.message : error.message
    const lowerMessage = message.toLowerCase()
    
    // Determine error type based on message content
    let errorType = ErrorType.UNKNOWN
    let retryable = false
    
    // Not found errors
    if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
      errorType = ErrorType.NOT_FOUND
      retryable = false
    }
    // Permission errors
    else if (lowerMessage.includes('permission') || 
             lowerMessage.includes('unauthorized') ||
             lowerMessage.includes('forbidden') ||
             lowerMessage.includes('access denied')) {
      errorType = ErrorType.PERMISSION
      retryable = false
    }
    // Network errors
    else if (lowerMessage.includes('network') ||
             lowerMessage.includes('timeout') ||
             lowerMessage.includes('timed out') ||
             lowerMessage.includes('connection') ||
             lowerMessage.includes('econnreset') ||
             lowerMessage.includes('enotfound') ||
             lowerMessage.includes('503') ||
             lowerMessage.includes('429')) {
      errorType = ErrorType.NETWORK
      retryable = true
    }
    // Conflict errors (file already exists, etc.)
    else if (lowerMessage.includes('already exists') ||
             lowerMessage.includes('conflict') ||
             lowerMessage.includes('duplicate')) {
      errorType = ErrorType.CONFLICT
      retryable = false
    }
    // Validation errors (invalid file type, size, etc.)
    else if (lowerMessage.includes('invalid') ||
             lowerMessage.includes('validation') ||
             lowerMessage.includes('format') ||
             lowerMessage.includes('size') ||
             lowerMessage.includes('type')) {
      errorType = ErrorType.VALIDATION
      retryable = false
    }
    
    return new DatabaseApiError(
      message,
      errorType,
      {
        operation,
        path,
        originalError: error
      },
      retryable
    )
  }

  /**
   * Gets a user-friendly error message in Turkish
   * 
   * Implements Requirement 7.4: User-facing error messages
   * 
   * @returns Turkish error message appropriate for end users
   */
  getUserMessage(): string {
    switch (this.type) {
      case ErrorType.VALIDATION:
        return 'Girilen bilgiler geçersiz. Lütfen kontrol edip tekrar deneyin.'
      
      case ErrorType.NETWORK:
        return 'Bağlantı hatası oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
      
      case ErrorType.PERMISSION:
        return 'Bu işlem için yetkiniz bulunmuyor.'
      
      case ErrorType.NOT_FOUND:
        return 'İstenen kayıt bulunamadı.'
      
      case ErrorType.CONFLICT:
        // Check if it's a version conflict
        if (this.message.includes('version') || this.message.includes('optimistic')) {
          return 'Bu kayıt başka bir kullanıcı tarafından değiştirildi. Lütfen sayfayı yenileyin ve tekrar deneyin.'
        }
        // Check if it's a duplicate
        if (this.message.includes('duplicate') || this.message.includes('unique') || this.message.includes('already exists')) {
          return 'Bu kayıt zaten mevcut.'
        }
        return 'İşlem çakışması oluştu. Lütfen tekrar deneyin.'
      
      case ErrorType.TRANSACTION:
        return 'İşlem sırasında bir hata oluştu. Değişiklikler geri alındı.'
      
      case ErrorType.UNKNOWN:
      default:
        return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
    }
  }

  /**
   * Checks if this error should trigger a retry
   * 
   * @returns true if the operation should be retried
   */
  isRetryable(): boolean {
    return this.retryable
  }

  /**
   * Gets detailed error information for logging
   * 
   * @returns Object with all error details
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      retryable: this.retryable,
      details: this.details,
      stack: this.stack
    }
  }
}
