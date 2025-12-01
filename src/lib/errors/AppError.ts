/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public userMessage: string,
    public isRetryable: boolean = false,
    public details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Database operation error
 * Thrown when database queries or operations fail
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    public operation: 'select' | 'insert' | 'update' | 'delete',
    public table?: string,
    userMessage: string = 'Veritabanı işlemi başarısız oldu',
    isRetryable: boolean = true,
    details?: unknown,
    code: string = 'DATABASE_ERROR'
  ) {
    super(message, code, 500, userMessage, isRetryable, details)
  }
}

/**
 * Validation error
 * Thrown when input validation fails
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public field: string,
    public constraint: string,
    userMessage: string = 'Girdi doğrulama hatası',
    details?: unknown
  ) {
    super(message, 'VALIDATION_ERROR', 400, userMessage, false, details)
  }
}

/**
 * Storage operation error
 * Thrown when file storage operations fail
 * 
 * Enhanced with context-aware messaging (Requirement 4.4):
 * - Operation type (upload, download, delete, list, move)
 * - File path for specific context
 * - File name extracted from path
 * - Actionable guidance based on operation
 */
export class StorageError extends AppError {
  public fileName?: string

  constructor(
    message: string,
    public operation: 'upload' | 'download' | 'delete' | 'list' | 'move',
    public path?: string,
    userMessage: string = 'Dosya işlemi başarısız oldu',
    isRetryable: boolean = true,
    details?: unknown,
    code: string = 'STORAGE_ERROR'
  ) {
    super(message, code, 500, userMessage, isRetryable, details)
    
    // Extract file name from path for better context
    if (path) {
      const pathParts = path.split('/')
      this.fileName = pathParts[pathParts.length - 1]
    }
  }
}

/**
 * File processing error
 * Thrown when file processing (PDF, image conversion) fails
 */
export class ProcessingError extends AppError {
  constructor(
    message: string,
    public stage: 'pdf_processing' | 'image_conversion' | 'file_validation',
    userMessage: string = 'Dosya işleme hatası',
    isRetryable: boolean = false,
    details?: unknown
  ) {
    super(message, 'PROCESSING_ERROR', 500, userMessage, isRetryable, details)
  }
}

/**
 * Authentication error
 * Thrown when authentication or authorization fails
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string,
    public reason: 'invalid_credentials' | 'session_expired' | 'unauthorized',
    userMessage: string = 'Yetkiniz bulunmamaktadır',
    details?: unknown
  ) {
    super(message, 'AUTH_ERROR', 401, userMessage, false, details)
  }
}
