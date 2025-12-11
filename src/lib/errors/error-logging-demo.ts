/**
 * Error Handling and Logging System Demonstration
 * 
 * This file demonstrates how the centralized error handling and logging systems
 * work together to provide consistent error processing throughout the application.
 * 
 * Requirements satisfied:
 * - 4.1: Single, consistent error handling pattern
 * - 4.2: Centralized logging mechanism
 * - 4.3: Consistent, localized error messages
 * - 4.4: Proper context information for debugging
 * - 4.5: Standardized error handling patterns
 * - 5.1: Single, consistent logging interface
 * - 5.2: Structured logging with timestamps, levels, and context
 * - 5.3: Error details, stack traces, and relevant context
 */

import { 
  AppError, 
  DatabaseError, 
  StorageError, 
  ValidationError, 
  AuthenticationError, 
  ProcessingError 
} from './AppError'
import { ErrorHandler } from './errorHandler'
import { logger } from '@/lib/services/Logger'

/**
 * Demonstrates the standardized error handling pattern
 * This is the single pattern that should be used throughout the application
 */
export async function demonstrateErrorHandling() {
  logger.info('=== Error Handling and Logging System Demo ===')

  // 1. Database Error Handling
  logger.info('1. Database Error Handling:')
  try {
    // Simulate a Supabase error
    const supabaseError = {
      name: 'PostgrestError',
      message: 'Row not found',
      code: 'PGRST116',
      details: '',
      hint: ''
    }
    
    // Use ErrorHandler to convert to AppError
    const dbError = ErrorHandler.handleSupabaseError(supabaseError, 'select', 'magazines')
    
    logger.info('  - Error Code:', { code: dbError.code })
    logger.info('  - User Message:', { message: dbError.userMessage })
    logger.info('  - Is Retryable:', { retryable: dbError.isRetryable })
    logger.info('  - Severity:', { severity: ErrorHandler.getSeverity(dbError) })
    logger.info('  - Recovery Actions:', { actions: ErrorHandler.getRecoveryActions(dbError) })
    
  } catch {
    logger.info('  - Handled database error successfully')
  }

  logger.info('2. Storage Error Handling:')
  try {
    // Simulate a storage error
    const storageError = new Error('File not found')
    
    // Use ErrorHandler to convert to AppError
    const appError = ErrorHandler.handleStorageError(storageError, 'download', 'magazines/1/cover.jpg')
    
    logger.info('  - Error Code:', { code: appError.code })
    logger.info('  - User Message:', { message: appError.userMessage })
    logger.info('  - File Name:', { fileName: appError.fileName })
    logger.info('  - Operation:', { operation: appError.operation })
    logger.info('  - Recovery Actions:', { actions: ErrorHandler.getRecoveryActions(appError) })
    
  } catch {
    logger.info('  - Handled storage error successfully')
  }

  logger.info('3. Validation Error Handling:')
  try {
    // Create a validation error
    const validationError = new ValidationError(
      'Title is required',
      'title',
      'required',
      'Başlık alanı zorunludur'
    )
    
    logger.info('  - Error Code:', { code: validationError.code })
    logger.info('  - User Message:', { message: validationError.userMessage })
    logger.info('  - Field:', { field: validationError.field })
    logger.info('  - Constraint:', { constraint: validationError.constraint })
    logger.info('  - Is Retryable:', { retryable: validationError.isRetryable })
    
  } catch {
    logger.info('  - Handled validation error successfully')
  }

  logger.info('4. Result Pattern Usage:')
  
  // Success case
  const successResult = ErrorHandler.success({ data: 'Operation completed' })
  logger.info('  - Success Result:', { result: successResult })
  
  // Failure case
  const error = new ProcessingError('PDF processing failed', 'pdf_processing')
  const failureResult = ErrorHandler.failure(error)
  logger.info('  - Failure Result:', { result: failureResult })

  logger.info('5. Error Classification:')
  const errors = [
    new DatabaseError('Connection failed', 'select', 'magazines', 'Database error', false),
    new StorageError('Upload failed', 'upload', 'file.jpg'),
    new ValidationError('Invalid input', 'field', 'required'),
    new AuthenticationError('Invalid credentials', 'invalid_credentials')
  ]
  
  errors.forEach((err, index) => {
    logger.info(`  - Error ${index + 1}:`, {
      type: err.constructor.name,
      severity: ErrorHandler.getSeverity(err),
      retryable: ErrorHandler.isRetryable(err),
      userMessage: ErrorHandler.getUserMessage(err)
    })
  })

  logger.info('=== Demo Complete ===')
}

/**
 * Example of how to use the error handling system in a service function
 */
export async function exampleServiceFunction(magazineId: string): Promise<{ success: true; data: unknown } | { success: false; error: unknown }> {
  try {
    // Simulate some operation that might fail
    if (!magazineId) {
      throw new ValidationError(
        'Magazine ID is required',
        'magazineId',
        'required',
        'Dergi ID gereklidir'
      )
    }
    
    if (magazineId === 'not-found') {
      // Simulate a database error
      const supabaseError = {
        name: 'PostgrestError',
        message: 'Magazine not found',
        code: 'PGRST116',
        details: '',
        hint: ''
      }
      throw ErrorHandler.handleSupabaseError(supabaseError, 'select', 'magazines')
    }
    
    // Success case
    return ErrorHandler.success({ magazine: { id: magazineId, title: 'Test Magazine' } })
    
  } catch (error) {
    // Convert any error to AppError using the error handler
    const appError = error instanceof AppError 
      ? error 
      : ErrorHandler.handleUnknownError(error)
    
    // Log the error with context (in real code, you'd use the Logger service)
    console.log('Service error occurred:', {
      errorCode: appError.code,
      operation: 'getMagazine',
      magazineId,
      isRetryable: appError.isRetryable,
      severity: ErrorHandler.getSeverity(appError)
    })
    
    // Return standardized error response
    return ErrorHandler.failure(appError)
  }
}

/**
 * Example of error handling in a component or API route
 */
export async function exampleErrorHandlingInComponent() {
  console.log('\n=== Component Error Handling Example ===')
  
  const testCases = ['valid-id', '', 'not-found', null]
  
  for (const testCase of testCases) {
    console.log(`\nTesting with: ${testCase || 'null'}`)
    
    const result = await exampleServiceFunction(testCase as string)
    
    if (result.success) {
      logger.info('  ✓ Success:', { data: result.data })
    } else {
      const error = result.error as AppError
      logger.info('  ✗ Error:', { message: error.userMessage })
      logger.info('    Code:', { code: error.code })
      
      // In a real component, you might:
      // - Show a toast notification with result.error.userMessage
      // - Log the technical details for debugging
      // - Provide recovery actions to the user
      // - Retry if the error is retryable
    }
  }
}

// Export the demo function for use in development/testing
if (typeof window === 'undefined') {
  // Only run in Node.js environment (not in browser)
  demonstrateErrorHandling().then(() => {
    return exampleErrorHandlingInComponent()
  }).catch(console.error)
}