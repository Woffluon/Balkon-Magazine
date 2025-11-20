import { PostgrestError } from '@supabase/supabase-js'
import { AppError, DatabaseError, StorageError } from './AppError'
import { ERROR_MESSAGES } from '@/lib/constants/errorMessages'

/**
 * Handles Supabase database errors and converts them to typed DatabaseError
 * @param error - The Supabase PostgrestError
 * @throws {DatabaseError} Always throws a DatabaseError
 */
export function handleSupabaseError(error: PostgrestError): never {
  console.error('Supabase error:', error)
  
  // Map specific error codes to user-friendly messages
  let message: string = ERROR_MESSAGES.DATABASE.GENERIC_ERROR
  
  if (error.code === 'PGRST116') {
    message = ERROR_MESSAGES.DATABASE.NOT_FOUND
  } else if (error.code === '23505') {
    message = ERROR_MESSAGES.DATABASE.DUPLICATE_ENTRY
  }
  
  throw new DatabaseError(message, error)
}

/**
 * Handles Supabase storage errors and converts them to typed StorageError
 * @param error - The Supabase storage error (can be Error or object with message)
 * @throws {StorageError} Always throws a StorageError
 */
export function handleStorageError(error: { message: string } | Error): never {
  console.error('Storage error:', error)
  
  let message: string = ERROR_MESSAGES.STORAGE.UPLOAD_FAILED
  const errorMessage = error instanceof Error ? error.message : error.message
  
  if (errorMessage.includes('not found')) {
    message = ERROR_MESSAGES.STORAGE.FILE_NOT_FOUND
  } else if (errorMessage.includes('bucket')) {
    message = ERROR_MESSAGES.STORAGE.BUCKET_NOT_FOUND
  }
  
  throw new StorageError(message, error)
}

/**
 * Handles unknown errors and converts them to typed AppError
 * @param error - The unknown error
 * @throws {AppError} Always throws an AppError or its subclass
 */
export function handleUnknownError(error: unknown): never {
  // If it's already an AppError, just re-throw it
  if (error instanceof AppError) {
    throw error
  }
  
  // If it's a standard Error, wrap it
  if (error instanceof Error) {
    console.error('Unknown error:', error)
    throw new AppError(error.message, 'UNKNOWN_ERROR', 500, error)
  }
  
  // For completely unknown types, create a generic error
  console.error('Unknown error:', error)
  throw new AppError(
    ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR,
    'UNKNOWN_ERROR',
    500,
    error
  )
}

/**
 * Handles upload errors with user-friendly logging
 * Used in upload dialogs to provide feedback to users
 * @param error - The error that occurred during upload
 * @param logger - Function to log messages to the UI
 */
export function handleUploadError(error: unknown, logger: (msg: string) => void): void {
  const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR
  logger(`Hata: ${errorMessage}`)
  
  // Check for HTML error responses (indicates server error, possibly due to large file)
  if (errorMessage.includes('Unexpected token') && errorMessage.includes('<html')) {
    logger('Sunucu HTML hatası döndürdü - büyük dosya problemi olabilir')
    alert('Yükleme hatası oluştu. Lütfen dosya boyutunu kontrol edin ve tekrar deneyin.')
  } else if (error instanceof AppError) {
    // For typed errors, show the user-friendly message
    alert(error.message)
  } else {
    // For unknown errors, show generic message
    alert(errorMessage)
  }
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
