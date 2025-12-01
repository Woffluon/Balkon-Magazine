# Implementation Plan

## Phase 1: Foundation - Logger Service and Error Infrastructure

- [x] 1. Set up logging infrastructure





  - Install dependencies (@sentry/nextjs, fast-check)
  - Create Logger service with structured logging
  - Implement log level filtering
  - Implement PII sanitization
  - Add environment-aware behavior (console in dev, Sentry in prod)
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.7, 3.8_

- [ ]* 1.1 Write property test for structured logging
  - **Property 10: Logger outputs structured metadata**
  - **Validates: Requirements 3.2**

- [ ]* 1.2 Write property test for log level filtering
  - **Property 11: Log levels filter appropriately**
  - **Validates: Requirements 3.4**

- [ ]* 1.3 Write property test for PII sanitization
  - **Property 12: PII is sanitized from logs**
  - **Validates: Requirements 3.5**


- [x] 2. Enhance AppError hierarchy



  - Extend AppError with userMessage and isRetryable fields
  - Create enhanced DatabaseError with operation and table fields
  - Create enhanced StorageError with operation and path fields
  - Create enhanced ValidationError with field and constraint fields
  - Create enhanced AuthenticationError with reason field
  - Create enhanced ProcessingError with stage field
  - _Requirements: 8.2_

- [ ]* 2.1 Write property test for error class hierarchy
  - **Property 32: Custom errors extend AppError**
  - **Validates: Requirements 8.2**


- [ ] 3. Implement Error Handler service



  - Create ErrorHandler class with transformation methods
  - Implement handleSupabaseError with error code mapping
  - Implement handleStorageError with operation context
  - Implement handleUnknownError with safe wrapping
  - Create Result<T> type and helper functions (success, failure)
  - Implement error classification (isRetryable, getSeverity)
  - Implement user message generation (getUserMessage, getRecoveryActions)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 8.1_

- [ ]* 3.1 Write property test for Result type discrimination
  - **Property 31: Server actions return discriminated unions**
  - **Validates: Requirements 8.1**

- [ ]* 3.2 Write property test for type guards
  - **Property 33: Type guards narrow error types**
  - **Validates: Requirements 8.3**

- [x] 4. Create error message catalog









  - Define ErrorMessageCatalog interface
  - Create comprehensive error message mappings in Turkish
  - Include user messages, technical messages, and recovery actions
  - Ensure no internal details in user messages
  - Implement consistent error code format
  - _Requirements: 4.5, 4.6, 4.7_

- [ ]* 4.1 Write property test for error code format
  - **Property 18: Error codes follow consistent format**
  - **Validates: Requirements 4.5**

- [ ]* 4.2 Write property test for message sanitization
  - **Property 19: User messages don't expose internals**
  - **Validates: Requirements 4.6**

- [x] 5. Integrate Sentry error tracking




  - Configure Sentry for Next.js (sentry.client.config.ts, sentry.server.config.ts)
  - Set up environment-specific configuration
  - Implement PII scrubbing before transmission
  - Configure error sampling rates
  - Add user context to error reports
  - Test Sentry integration in development
  - _Requirements: 3.3, 7.1, 7.2, 7.6_

- [ ]* 5.1 Write property test for PII scrubbing before external transmission
  - **Property 30: PII is scrubbed before external transmission**
  - **Validates: Requirements 7.6**

- [ ]* 5.2 Write property test for error context inclusion
  - **Property 28: Error tracking includes user context**
  - **Validates: Requirements 7.2**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Error Boundaries

- [x] 7. Implement root error boundary



  - Create app/error.tsx with error boundary component
  - Add error logging to Logger service
  - Implement "Retry" and "Go Home" actions
  - Show error details in development mode only
  - Style error UI consistently with app design
  - _Requirements: 2.1_


- [x] 8. Implement admin error boundary




  - Create app/(admin)/admin/error.tsx
  - Preserve admin layout in error state
  - Add admin-specific recovery options
  - Log errors with admin context
  - _Requirements: 2.2_
-

- [x] 9. Implement magazine detail error boundary




  - Create app/(public)/dergi/[sayi]/error.tsx
  - Add "Retry" and "Back to List" actions
  - Log errors with magazine context (issue number)
  - _Requirements: 2.3_

- [x] 10. Implement FlipbookViewer error boundary




  - Create FlipbookViewerErrorBoundary component
  - Wrap FlipbookViewer with error boundary
  - Implement retry functionality
  - Handle image loading errors gracefully
  - _Requirements: 2.4_

- [ ]* 10.1 Write property test for image preload error handling
  - **Property 21: Image preload errors don't cause retry loops**
  - **Validates: Requirements 5.2**


- [x] 11. Implement UploadDialog error recovery



  - Add error state management to UploadDialog
  - Preserve upload progress on errors
  - Implement retry without losing progress
  - Add error recovery UI
  - _Requirements: 2.5_

- [ ]* 11.1 Write property test for upload progress preservation
  - **Property 9: Upload errors preserve progress**
  - **Validates: Requirements 2.5**

- [ ]* 11.2 Write property test for upload retry
  - **Property 23: Upload retry preserves progress**
  - **Validates: Requirements 6.1**

- [x] 12. Implement global error handlers



  - Create GlobalErrorHandler class
  - Register window.onerror handler
  - Register window.onunhandledrejection handler
  - Add to root layout
  - Log unhandled errors to Logger service
  - _Requirements: 5.6, 5.7_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Try-Catch Coverage and Server Actions
-

- [x] 14. Add try-catch to middleware




  - Wrap supabase.auth.getSession() in try-catch
  - Handle auth failures gracefully
  - Log errors with middleware context
  - Implement fallback redirect logic
  - _Requirements: 1.1_

- [ ]* 14.1 Write property test for middleware error handling
  - **Property 1: Middleware auth failures are handled gracefully**
  - **Validates: Requirements 1.1**

- [x] 15. Update admin/page.tsx with try-catch





  - Wrap magazine fetching in try-catch
  - Return Result<Magazine[]> type
  - Display user-friendly error UI
  - Log errors with page context
  - _Requirements: 1.2_

-

- [x] 16. Update dergi/[sayi]/page.tsx with try-catch



  - Wrap magazine detail fetching in try-catch
  - Wrap storage list operation in try-catch
  - Handle partial failures (magazine found but pages not)
  - Return appropriate error responses
  - _Requirements: 1.2, 1.3_
-

- [x] 17. Update lib/magazines.ts with try-catch




  - Add try-catch to getPublishedMagazines
  - Return Result<Magazine[]> instead of throwing
  - Log errors with function context
  - _Requirements: 1.2_

- [ ]* 17.1 Write property test for server action error responses
  - **Property 2: Server actions return typed error responses**
  - **Validates: Requirements 1.2**

- [x] 18. Fix deleteMagazine transactional consistency





  - Implement storage-first, database-second pattern
  - Add rollback logic if storage deletion fails
  - Track partial failures
  - Return detailed error responses
  - Log all operations with context
  - _Requirements: 1.6, 6.4_

- [ ]* 18.1 Write property test for deletion transactional consistency
  - **Property 6: Magazine deletion maintains transactional consistency**
  - **Validates: Requirements 1.6**

- [ ]* 18.2 Write property test for deletion rollback
  - **Property 26: Deletion failures trigger rollback**
  - **Validates: Requirements 6.4**
-

- [x] 19. Fix renameMagazine error handling



  - Add try-catch to entire operation
  - Track individual file operation results
  - Use Promise.allSettled for parallel operations
  - Return detailed failure reports
  - Implement partial success handling
  - _Requirements: 1.7, 5.3, 6.5_

- [ ]* 19.1 Write property test for rename failure tracking
  - **Property 7: Rename operations track individual failures**
  - **Validates: Requirements 1.7**

- [ ]* 19.2 Write property test for parallel operations
  - **Property 22: Parallel operations use Promise.allSettled**
  - **Validates: Requirements 5.3**

- [ ]* 19.3 Write property test for rename failure reports
  - **Property 27: Rename failures provide detailed reports**
  - **Validates: Requirements 6.5**
-

- [x] 20. Fix listAllFiles recursive error handling




  - Add depth limit parameter (default 10)
  - Add per-directory error handling
  - Track failed directories
  - Return partial results on errors
  - Log warnings for depth limit and failures
  - _Requirements: 1.4_

- [ ]* 20.1 Write property test for recursive depth limits
  - **Property 4: Recursive operations respect depth limits**
  - **Validates: Requirements 1.4**
-

- [x] 21. Fix logout error handling




  - Add try-catch to logout function
  - Handle sign-out errors gracefully
  - Ensure session cleanup even on error
  - Force redirect as fallback
  - _Requirements: 1.8_

- [ ]* 21.1 Write property test for logout error handling
  - **Property 8: Logout handles sign-out errors**
  - **Validates: Requirements 1.8**

- [x] 22. Fix lib/supabase/server.ts cookie errors




  - Replace empty catch blocks with error logging
  - Log cookie operation failures with context
  - Don't throw (non-blocking failures)
  - _Requirements: 1.5_

- [ ]* 22.1 Write property test for cookie failure logging
  - **Property 5: Cookie failures are logged**
  - **Validates: Requirements 1.5**

- [x] 23. Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Error Recovery and Retry Mechanisms
-

- [x] 24. Implement retry mechanism with exponential backoff




  - Create withRetry utility function
  - Implement exponential backoff algorithm
  - Add max attempts limit
  - Add retryable error detection
  - Add configuration options
  - _Requirements: 6.2_

- [ ]* 24.1 Write property test for exponential backoff
  - **Property 24: Transient errors trigger exponential backoff**
  - **Validates: Requirements 6.2**




- [x] 25. Add retry to database operations




  - Wrap database queries with withRetry
  - Configure retryable error codes (timeout, connection)



  - Set appropriate retry limits
  - Log retry attempts
  - _Requirements: 6.2_

- [x] 26. Add partial retry to storage operations






  - Track successful vs failed operations
  - Only retry failed operations
  - Preserve successful operation results
  - Return combined results
  - _Requirements: 6.3_

- [ ]* 26.1 Write property test for partial storage retry
  - **Property 25: Partial storage failures retry selectively**
  - **Validates: Requirements 6.3**




- [x] 27. Add storage operation error handling






  - Wrap all storage operations in try-catch
  - Transform storage errors to StorageError
  - Add operation context (upload, delete, list, move)
  - Return Result<T> types
  - _Requirements: 1.3_

- [ ]* 27.1 Write property test for storage partial failures
  - **Property 3: Storage operations handle partial failures**
  - **Validates: Requirements 1.3**

- [ ] 28. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Error Message Quality and User Experience
- [x] 29. Improve validation error messages




- [ ] 29. Improve validation error messages

  - Update all validation errors to be field-specific
  - Add correction guidance to messages
  - Use error message catalog
  - Ensure messages are in Turkish
  - _Requirements: 4.1_

- [ ]* 29.1 Write property test for validation error specificity
  - **Property 14: Validation errors are field-specific**
  - **Validates: Requirements 4.1**
-

- [x] 30. Improve authentication error messages








  - Make auth error messages generic
  - Don't reveal whether email or password was wrong
  - Add recovery guidance (contact admin)
  - Use error message catalog
  - _Requirements: 4.2_

- [ ]* 30.1 Write property test for auth error security
  - **Property 15: Auth errors don't expose security details**
  - **Validates: Requirements 4.2**
-
-

- [x] 31. Separate user and technical error messages






  - Update all database errors to show generic user messages
  - Log technical details separately
  - Use error message catalog
  - Ensure no internal details in user messages
  - _Requirements: 4.3, 4.6_

- [ ]* 31.1 Write property test for database error message separation
  - **Property 16: Database errors separate user and technical messages**
  - **Validates: Requirements 4.3**


- [x] 32. Make storage error messages context-aware




  - Update storage errors to reflect operation type
  - Add relevant context (file name, path)
  - Use error message catalog
  - Provide actionable guidance
  - _Requirements: 4.4_

- [ ]* 32.1 Write property test for storage error context
  - **Property 17: Storage errors are context-aware**
  - **Validates: Requirements 4.4**



- [x] 33. Add progress indication to multi-step operations



  - Update upload error messages to show progress
  - Update rename error messages to show completed steps
  - Update deletion error messages to show what was deleted
  - Use error message catalog
  - _Requirements: 4.7_

- [ ]* 33.1 Write property test for multi-step error progress
  - **Property 20: Multi-step errors indicate progress**
  - **Validates: Requirements 4.7**

- [ ] 34. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Replace Console Statements with Logger

- [x] 35. Replace console statements in admin/actions.ts




  - Replace all console.error with logger.error
  - Replace all console.warn with logger.warn
  - Add structured context to all log calls
  - Remove any console.log statements
  - _Requirements: 3.1_




- [x] 36. Replace console statements in admin/page.tsx





  - Replace console.error with logger.error
  - Add page context to log calls
  - _Requirements: 3.1_

- [x] 37. Replace console statements in UploadDialog.tsx




- [ ] 37. Replace console statements in UploadDialog.tsx
  - Replace all console.warn with logger.warn
  - Replace all console.error with logger.error
  - Add upload context to log calls
  - _Requirements: 3.1_

- [x] 38. Replace console statements in middleware.ts




  - Replace any console statements with logger calls
  - Add middleware context
  - _Requirements: 3.1_

-

- [x] 39. Replace console statements in lib/supabase/server.ts


  - Replace empty catch blocks with logger.error
  - Add cookie operation context
  - _Requirements: 3.1_

-

- [x] 40. Scan codebase for remaining console statements







  - Use grep to find remaining console.log/error/warn
  - Replace with appropriate logger calls
  - Verify no console statements remain in production code
  - _Requirements: 3.1_

- [ ]* 40.1 Write property test for error log completeness
  - **Property 13: Error logs include required context**
  - **Validates: Requirements 3.6**

- [ ] 41. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Promise Rejection Handling
-

- [x] 42. Add error handling to FlipbookViewer image preloading



  - Add onerror handler to image preload
  - Mark failed images as attempted
  - Prevent retry loops
  - Log image load failures
  - Add cleanup on unmount
  - _Requirements: 5.2_

- [x] 43. Add error handling to wake lock requests





  - Wrap wake lock request in try-catch
  - Log failures but continue operation
  - Don't block upload on wake lock failure
  - _Requirements: 5.4_

- [x] 44. Add error handling to upload log saving





  - Wrap saveUploadLog in try-catch
  - Log failures but don't block main upload
  - Continue upload even if log save fails
  - _Requirements: 5.5_

- [x] 45. Add catch handlers to all async operations





  - Audit codebase for async operations without catch
  - Add catch handlers or propagate errors
  - Ensure no unhandled promise rejections
  - _Requirements: 5.1_

- [ ] 46. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Monitoring and Performance
-

- [x] 47. Add performance tracking to Logger



  - Implement startTimer and logPerformance methods
  - Add performance tracking to critical operations
  - Log slow operations (> 1s)
  - Send performance data to Sentry
  - _Requirements: 7.4_

- [ ]* 47.1 Write property test for performance tracking
  - **Property 29: Performance tracking logs operation timing**
  - **Validates: Requirements 7.4**
-

- [x] 48. Configure Sentry alerts



  - Set up alert rules for critical errors
  - Configure error rate alerts
  - Set up performance degradation alerts
  - Test alert delivery
  - _Requirements: 7.1_




- [ ] 49. Add error response Zod schemas
  - Create Zod schemas for error responses
  - Validate error responses in API calls
  - Ensure type safety for error handling
  - _Requirements: 8.4_

- [ ]* 49.1 Write property test for error response validation
  - **Property 34: Error responses validate with Zod**




  - **Validates: Requirements 8.4**

- [ ] 50. Verify error type propagation

  - Test that typed errors maintain types through call stack
  - Ensure no type widening to Error
  - Add type assertions where needed
  - _Requirements: 8.5_

- [ ]* 50.1 Write property test for error type propagation
  - **Property 35: Error types propagate through call stack**
  - **Validates: Requirements 8.5**

- [ ] 51. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 9: Documentation and Cleanup

- [ ] 52. Update README with error handling documentation
  - Document Logger service usage
  - Document error handling patterns
  - Document error recovery mechanisms
  - Add examples of proper error handling
  - _Requirements: All_

- [ ] 53. Create error handling guide for developers
  - Document when to use each error type
  - Document retry strategies
  - Document error message guidelines
  - Document testing requirements
  - _Requirements: All_

- [ ] 54. Verify all error messages are in Turkish
  - Audit all user-facing error messages
  - Translate any English messages
  - Ensure consistent terminology
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 55. Final integration testing
  - Test all error flows end-to-end
  - Verify error boundaries work correctly
  - Verify Sentry integration works
  - Verify error recovery mechanisms work
  - Test in both development and production modes
  - _Requirements: All_
