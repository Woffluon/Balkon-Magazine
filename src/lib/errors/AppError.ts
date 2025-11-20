/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
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
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', 500, details)
  }
}

/**
 * Validation error
 * Thrown when input validation fails
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

/**
 * Storage operation error
 * Thrown when file storage operations fail
 */
export class StorageError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'STORAGE_ERROR', 500, details)
  }
}

/**
 * File processing error
 * Thrown when file processing (PDF, image conversion) fails
 */
export class ProcessingError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'PROCESSING_ERROR', 500, details)
  }
}

/**
 * Authentication error
 * Thrown when authentication or authorization fails
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Yetkiniz bulunmamaktadır') {
    super(message, 'AUTH_ERROR', 401)
  }
}
