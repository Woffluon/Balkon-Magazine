# Security Hardening Implementation Plan

- [x] 1. Create environment validation module




  - Create `src/lib/env.ts` with Zod schema for all environment variables
  - Validate NEXT_PUBLIC_SUPABASE_URL is a valid URL
  - Validate NEXT_PUBLIC_SUPABASE_ANON_KEY is non-empty
  - Validate NODE_ENV is one of: development, production, test
  - Validate NEXT_PUBLIC_SITE_URL is a valid URL if provided
  - Export validated env object for use throughout the app
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Create validation schemas module





  - Create `src/lib/validators/schemas.ts` with Zod schemas
  - Define MagazineSchema for title (1-200 chars, alphanumeric + spaces/hyphens/punctuation), issue_number (1-9999), publication_date (YYYY-MM-DD format)
  - Define UUIDSchema for database record IDs
  - Define IssueNumberSchema for file path validation
  - Export all schemas for reuse across the application
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 11.1, 11.2, 11.3_


- [x] 3. Implement file validation service




  - Create `src/lib/services/fileValidation.ts` with functions for magic number validation
  - Implement validatePDF() to check for PDF magic number (0x25 0x50 0x44 0x46)
  - Implement validateImage() to check for PNG (0x89 0x50 0x4E 0x47), JPEG (0xFF 0xD8 0xFF), or WebP (0x52 0x49 0x46 0x46...0x57 0x45 0x42 0x50) magic numbers
  - Implement validateMimeType() to verify MIME types match allowed list
  - Implement validateFileSize() to enforce 50MB for PDFs and 10MB for images
  - Return FileValidationResult with valid flag and error message
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 1.1, 1.2, 1.3, 1.4_

- [x] 4. Implement rate limiting service





  - Create `src/lib/services/rateLimiting.ts` with RateLimiter class
  - Implement in-memory storage for login attempts (key: IP address)
  - Implement in-memory storage for upload attempts (key: user ID)
  - Implement checkLoginLimit() to enforce 5 attempts per 15 minutes per IP
  - Implement recordLoginAttempt() to track failed login attempts
  - Implement recordUploadAttempt() to track upload attempts
  - Implement automatic cleanup of expired entries
  - Export singleton rateLimiter instance
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_

- [x] 5. Implement authorization service




  - Create `src/lib/services/authorization.ts` with authorization functions
  - Implement requireAdmin() to verify user has admin role from user_profiles table
  - Implement verifyCSRFOrigin() to validate request origin matches application host
  - Implement refreshSessionIfNeeded() to refresh session if within 5 minutes of expiration
  - Implement sanitizeIssueNumber() to validate issue number contains only digits
  - Export all functions for use in server actions
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 13.3, 13.4, 11.1, 11.2, 11.3_


- [x] 6. Update admin upload action with file validation




  - Update `src/app/admin/UploadDialog.tsx` to add client-side file size validation
  - Add file size checks before upload (50MB for PDF, 10MB for image)
  - Display user-friendly error messages for size violations
  - Update `src/app/admin/actions.ts` addMagazineRecord() to validate files server-side
  - Call validatePDF() and validateImage() before processing files
  - Call validateMimeType() to verify MIME types
  - Call validateFileSize() to verify sizes
  - Return validation errors to client
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_
-

- [x] 7. Update admin upload action with rate limiting




  - Update `src/app/admin/actions.ts` addMagazineRecord() to check upload rate limit
  - Call rateLimiter.checkUploadLimit() with user ID
  - Call rateLimiter.recordUploadAttempt() after successful upload
  - Return rate limit error if limit exceeded
  - _Requirements: 10.1, 10.2, 10.3, 10.4_
-

- [x] 8. Update admin actions with input validation




  - Update `src/app/admin/actions.ts` addMagazineRecord() to validate magazine metadata
  - Parse FormData and validate using MagazineSchema
  - Return validation errors if any field fails
  - Update deleteMagazine() to validate ID using UUIDSchema
  - Update updateMagazine() to validate ID using UUIDSchema
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_
- [x] 9. Update admin actions with CSRF protection




- [ ] 9. Update admin actions with CSRF protection

  - Update `src/app/admin/actions.ts` addMagazineRecord() to verify CSRF origin
  - Call verifyCSRFOrigin() at start of action
  - Return CSRF error if origin validation fails
  - Update deleteMagazine() to verify CSRF origin
  - Update updateMagazine() to verify CSRF origin
  - _Requirements: 8.1, 8.2, 8.3, 8.4_
-

- [x] 10. Update admin actions with authorization checks




  - Update `src/app/admin/actions.ts` addMagazineRecord() to require admin role
  - Call requireAdmin() at start of action
  - Return unauthorized error if user is not admin
  - Update deleteMagazine() to require admin role
  - Update updateMagazine() to require admin role
  - _Requirements: 12.1, 12.2, 12.3, 12.4_
-

- [x] 11. Update login action with rate limiting




  - Update `src/app/admin/login/actions.ts` to implement login rate limiting
  - Extract client IP from request headers
  - Call rateLimiter.checkLoginLimit() before processing login
  - Call rateLimiter.recordLoginAttempt() on failed login
  - Return rate limit error if limit exceeded
  - _Requirements: 9.1, 9.2, 9.3, 9.4_
-

- [x] 12. Update structured data with XSS prevention




  - Update `src/app/layout.tsx` to use Next.js Script component
  - Replace dangerouslySetInnerHTML with Script component for JSON-LD
  - Implement escapeJsonLd() function to escape HTML entities (< to \\u003c, > to \\u003e)
  - Validate NEXT_PUBLIC_SITE_URL before using in structured data
  - Use safe default if environment variable is invalid
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 13. Update middleware with session refresh logic




  - Update `middleware.ts` to implement session refresh
  - Check if session is within 5 minutes of expiration
  - Call refreshSessionIfNeeded() to refresh session before expiration
  - Configure Supabase JWT expiry to 1 hour
  - _Requirements: 13.1, 13.2, 13.3, 13.4_
-

- [x] 14. Update all imports to use validated environment variables




  - Update `src/lib/supabase/server.ts` to import from env module
  - Update `src/lib/supabase/client.ts` to import from env module
  - Update `middleware.ts` to import from env module
  - Update any other files using process.env directly
  - Remove non-null assertions (!) since env is pre-validated
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
-

- [x] 15. Create Supabase RLS policies




  - Create migration to enable RLS on magazines table
  - Create policy for public SELECT: only published magazines
  - Create policy for admin INSERT: verify user role is admin
  - Create policy for admin UPDATE: verify user role is admin
  - Create policy for admin DELETE: verify user role is admin
  - Apply migration to database
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_




- [x] 16. Add Content Security Policy headers





  - Update `next.config.ts` to add CSP headers configuration
  - Configure default-src to 'self'
  - Configure script-src to 'self', 'unsafe-inline', 'unsafe-eval', and trusted CDNs
  - Configure style-src to 'self' and 'unsafe-inline'
  - Configure img-src to 'self', data:, and https:

  - Configure font-src to 'self' and data:
  - Configure connect-src to 'self' and Supabase domains
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_