# Implementation Plan

## Phase 1: Foundation (Infrastructure Layer)

- [x] 1. Create constants and configuration files




  - Create constants directory structure
  - Define upload configuration constants (image quality, PDF settings, storage settings, limits)
  - Define storage configuration and path helper functions
  - Define flipbook configuration constants
  - Define server configuration constants (body size limits, timeouts)
  - Update next.config.ts to reduce body size limit from 100GB to 50MB
  - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3_



- [x] 2. Create error handling infrastructure



  - Create errors directory structure
  - Define base AppError class with code, statusCode, and details
  - Define specialized error classes (DatabaseError, ValidationError, StorageError, ProcessingError, AuthenticationError)
  - Create error handler utility functions (handleSupabaseError, handleStorageError, handleUnknownError, handleUploadError)
  - Define error messages constants file with all error messages organized by category
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3. Create type definitions and DTOs





  - Update Magazine interface with all required fields
  - Create upload-related type definitions (MagazineUploadData, ProcessedPage)
  - Create storage-related type definitions (StorageFile, UploadOptions, ListOptions)
  - Create DTO types (CreateMagazineDto, UpdateMagazineDto, DeleteMagazineDto, RenameMagazineDto)
  - _Requirements: 10.4, 12.3, 12.4_

## Phase 2: Data Access Layer

- [x] 4. Create repository pattern infrastructure





  - Create repositories directory structure
  - Define IMagazineRepository interface with all CRUD methods
  - Define IStorageService interface with upload, delete, move, copy, list, and getPublicUrl methods
  - _Requirements: 2.1, 2.2, 4.2_

- [x] 5. Implement Supabase repository





  - Implement SupabaseMagazineRepository class
  - Implement findAll method with proper error handling
  - Implement findByIssue method with not-found handling
  - Implement findById method
  - Implement create method with upsert logic
  - Implement update method
  - Implement delete method
  - Convert all Supabase errors to DatabaseError
  - _Requirements: 2.3, 4.3, 5.3_

- [x] 6. Implement Supabase storage service





  - Implement SupabaseStorageService class
  - Implement upload method with configurable options
  - Implement delete method for batch file deletion
  - Implement move method with fallback to copy+delete
  - Implement copy method
  - Implement list method with pagination support
  - Implement getPublicUrl method
  - Convert all storage errors to StorageError
  - _Requirements: 2.4, 4.4, 5.3_
- [x] 7. Create Supabase client helper functions




- [ ] 7. Create Supabase client helper functions

  - Create useSupabaseClient hook for browser client with memoization
  - Create getAuthenticatedClient helper for server with auth check and redirect
  - Create getServerClient helper for server without auth
  - Update existing Supabase client creation to use helpers
  - _Requirements: 4.1, 9.1, 9.2_

## Phase 3: Business Logic Layer

- [x] 8. Implement file processor pattern





  - Create processors directory structure
  - Define IFileProcessor interface with canProcess and process methods
  - Define ProcessOptions and ProcessResult interfaces
  - Implement PDFProcessor class with PDF to WebP conversion
  - Implement ImageProcessor class with image to WebP conversion
  - Implement FileProcessorFactory class with processor registration
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
-

- [x] 9. Implement MagazineService




  - Create services directory structure
  - Implement MagazineService class with repository and storage dependencies
  - Implement getAllMagazines method
  - Implement getMagazineByIssue method
  - Implement createMagazine method
  - Implement deleteMagazine method with storage cleanup
  - Implement renameMagazine method with file moving
  - Implement private helper methods (deleteIssueFiles, moveIssueFiles, listAllIssueFiles)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.4_
-

- [x] 10. Implement UploadService



  - Implement UploadService class with storage, repository, and processor factory dependencies
  - Implement uploadMagazine method with progress callbacks
  - Implement processPDFToPages private method
  - Implement handleCover private method for custom or auto-generated covers
  - Add progress tracking and logging throughout upload process
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 11. Create validation layer with Zod





  - Create validators directory structure
  - Define createMagazineSchema with all field validations
  - Define updateMagazineSchema with optional fields
  - Define deleteMagazineSchema
  - Define renameMagazineSchema
  - Create parseFormDataWithZod utility function
  - Export inferred DTO types from schemas
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12. Create authentication middleware





  - Create middleware directory structure
  - Implement requireAuth function with session check and redirect
  - Implement getOptionalAuth function for optional authentication
  - _Requirements: 11.1, 9.3_

## Phase 4: Application Layer

- [x] 13. Refactor server actions to use new layers




  - Update addMagazineRecord to use requireAuth, parseFormDataWithZod, and MagazineService
  - Update deleteMagazine to use requireAuth, parseFormDataWithZod, and MagazineService
  - Update renameMagazine to use requireAuth, parseFormDataWithZod, and MagazineService
  - Create service factory helper function (createMagazineService)
  - Ensure each server action is less than 30 lines
  - Remove all direct Supabase client usage from actions
  - _Requirements: 11.2, 11.3, 11.4, 11.5, 4.4, 4.5_

- [x] 14. Update saveUploadLog action





  - Refactor saveUploadLog to use SupabaseStorageService
  - Use STORAGE_PATHS.getLogsPath for path generation
  - Use proper error handling with StorageError
  - _Requirements: 4.4, 6.3_

## Phase 5: Presentation Layer

- [x] 15. Create custom hooks for upload functionality





  - Create hooks directory structure
  - Implement useUploadForm hook with grouped form state
  - Implement useUploadProgress hook with progress tracking methods
  - Implement useUploadLogs hook with auto-scroll functionality
  - Implement useUploadState hook for localStorage persistence
  - Implement useWakeLock hook for screen wake lock management
  - Implement useStorageService hook with memoized service instance
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 9.4_

- [x] 16. Create UploadDialog sub-components




  - Create admin/components directory structure
  - Extract UploadForm component with form fields
  - Extract UploadProgress component with progress bars
  - Extract UploadLogs component with log display
  - Extract ProgressBar component if not already exists
  - _Requirements: 1.4_
-

- [x] 17. Refactor UploadDialog component




  - Replace useState hooks with custom hooks (useUploadForm, useUploadProgress, useUploadLogs, useUploadState, useWakeLock)
  - Replace direct Supabase usage with useStorageService hook
  - Simplify handleSubmit to use UploadService
  - Use sub-components for form, progress, and logs
  - Reduce component to less than 150 lines
  - Maintain all existing functionality (background processing, visibility handling, wake lock)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.4_
-

- [x] 18. Update other components to use new patterns




  - Update admin page to use MagazineService instead of direct Supabase
  - Update magazine viewer page to use MagazineService
  - Update lib/magazines.ts to use repository pattern
  - Remove all remaining direct Supabase client usage from components
  - _Requirements: 4.1, 4.4, 4.5_

## Phase 6: Code Quality and Cleanup

- [x] 19. Remove code duplication





  - Verify all Supabase client creation uses helper functions
  - Verify all form data parsing uses parseFormDataWithZod
  - Verify all auth checks use requireAuth middleware
  - Verify all error handling uses custom error classes
  - Verify all storage paths use STORAGE_PATHS helpers
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_



- [x] 20. Improve type safety


  - Remove all non-null assertions (!) from codebase
  - Add runtime type guards where needed
  - Replace unsafe type casts with validated casts
  - Enable TypeScript strict mode if not already enabled
  - Fix all TypeScript errors
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 21. Update folder structure





  - Verify all files are in correct directories per design
  - Create README files for major directories explaining their purpose
  - Update import paths to use new structure
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

## Phase 7: Testing and Validation

- [ ]* 22. Write unit tests for repositories
  - Write tests for SupabaseMagazineRepository (findAll, findByIssue, create, update, delete)
  - Write tests for SupabaseStorageService (upload, delete, move, copy, list)
  - Mock Supabase client for isolated testing
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 23. Write unit tests for services
  - Write tests for MagazineService (getAllMagazines, deleteMagazine, renameMagazine)
  - Write tests for UploadService
  - Mock repository and storage dependencies
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 24. Write unit tests for processors
  - Write tests for PDFProcessor (canProcess, process)
  - Write tests for ImageProcessor (canProcess, process)
  - Write tests for FileProcessorFactory
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 25. Write integration tests for server actions
  - Write tests for addMagazineRecord (auth, validation, success)
  - Write tests for deleteMagazine
  - Write tests for renameMagazine
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 26. Write component tests
  - Write tests for UploadDialog (rendering, validation, submission)
  - Write tests for custom hooks
  - Write tests for sub-components
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 27. Manual testing and validation
  - Test magazine upload flow end-to-end
  - Test magazine deletion
  - Test magazine renaming
  - Test magazine viewing
  - Test background upload with tab switching
  - Test error scenarios
  - Verify all existing functionality works
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 28. Verify code quality metrics
  - Run LOC counter to verify component sizes (<150 lines)
  - Run complexity checker to verify cyclomatic complexity (<10)
  - Run code duplication checker to verify <5% duplication
  - Verify zero God Components
  - Verify zero direct Supabase dependencies in components
  - Document metrics in a report
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

## Phase 8: Documentation

- [ ]* 29. Add code documentation
  - Add JSDoc comments to all public APIs
  - Add interface documentation with examples
  - Add comments explaining complex algorithms
  - Create README files for each major directory
  - _Requirements: All requirements benefit from documentation_

- [ ]* 30. Create architecture decision records
  - Document ADR-001: Repository Pattern
  - Document ADR-002: Strategy Pattern for File Processing
  - Document ADR-003: Zod for Validation
  - Document other key architectural decisions
  - _Requirements: All requirements benefit from ADRs_
