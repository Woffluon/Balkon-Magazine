# Implementation Plan: UX Improvements

- [x] 1. Set up toast notification system and global accessibility infrastructure





  - Install Sonner or React Hot Toast library
  - Create Toaster provider component in root layout
  - Configure toast styling and positioning (top-right, 4s duration)
  - Add sr-only utility class to Tailwind config if missing
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 2. Implement FlipbookViewer keyboard navigation and focus management





  - Add live region div with role="status" aria-live="polite" for page announcements
  - Create page indicator display showing "current / total" at bottom of viewer
  - Add keyboard instruction text in sr-only div with aria-describedby reference
  - Apply role="region" aria-label="Dergi görüntüleyici" to container
  - Update keyboard event handler to announce page changes to live region
  - Implement visualViewport API for mobile keyboard detection
  - _Requirements: 1.1, 1.2, 1.5, 3.5, 4.1_


- [x] 3. Update Header component with mobile menu accessibility




  - Add useState for mobile menu open/closed state
  - Update mobile menu button with aria-label="Menü"
  - Add aria-expanded attribute reflecting menu state
  - Add aria-controls="mobile-navigation" to button
  - Update mobile navigation with id="mobile-navigation" and aria-label="Mobil navigasyon"
  - Replace DOM manipulation with state-based show/hide logic
  - Mark hamburger/X SVG with aria-hidden="true"
  - _Requirements: 1.3, 1.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 4. Add ARIA labels and semantic markup to social links





  - Add aria-label to Instagram link: "Instagram'da Balkon Dergisi (yeni sekmede açılır)"
  - Add aria-label to email link: "E-posta ile iletişime geç"
  - Mark all decorative SVG icons with aria-hidden="true"
  - Increase social icon size from w-8 h-8 to w-11 h-11
  - Increase SVG size from width="14" to width="18"
  - _Requirements: 1.6, 2.2, 3.2, 9.3_

- [x] 5. Implement MagazineCard accessibility improvements





  - Add aria-label to card links with format: "Sayı X dergisini oku"
  - Update image alt text to include issue number: "Title kapak görseli - Sayı X"
  - Mark decorative SVG icons with aria-hidden="true"
  - Add placeholder="blur" and blurDataURL to Image component
  - Add loading="lazy" attribute to Image component
  - _Requirements: 1.7, 2.1, 3.1, 4.2_

- [x] 6. Create admin page loading skeleton and Suspense boundary





  - Create loading.tsx with skeleton UI showing header, buttons, and table rows
  - Use animate-pulse for shimmer effect on skeleton elements
  - Create AdminLayout with Suspense boundary wrapping children
  - Set fallback to AdminLoading component
  - Ensure skeleton dimensions match actual content to prevent layout shift
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_


- [x] 7. Implement FlipbookViewer loading skeleton




  - Create custom loading component for dynamic import
  - Design book-shaped skeleton with page divider
  - Add animated spinner with loading text
  - Include role="status" aria-live="polite" on loading container
  - Add aria-label describing loading state
  - _Requirements: 3.2, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Update UploadDialog with mobile responsiveness





  - Change DialogContent width to w-[92vw] sm:w-[90vw] max-w-xl
  - Update max-height to max-h-[85vh] sm:max-h-[90vh]
  - Adjust log area height to h-32 sm:h-40 md:h-48
  - Update font sizes to text-[10px] sm:text-xs
  - Ensure all form fields are properly sized for mobile
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
-

- [x] 9. Implement UploadDialog progress bar accessibility




  - Add role="progressbar" to progress bar component
  - Add aria-valuenow, aria-valuemin, aria-valuemax attributes
  - Add aria-label for context: "Kapak yükleme ilerlemesi"
  - Display percentage next to each progress bar
  - Show file count for pages: "3 / 10 (% 30)"
  - Create overall progress container with highlighted styling
  - _Requirements: 2.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
- [x] 10. Implement error categorization and user-friendly messages




- [ ] 10. Implement error categorization and user-friendly messages

  - Create UploadError type with categories: network, file_size, file_type, server, unknown
  - Implement categorizeError function to detect error types
  - Create errorMessages object with user-friendly messages for each type
  - Implement showError function to display toast with recovery options
  - Replace alert() calls with toast notifications
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 11. Create admin page error state with recovery options





  - Update error state to display icon, title, description
  - Add "Sayfayı Yenile" button with window.location.reload()
  - Add "Destek İle İletişime Geç" link to support email
  - Apply role="alert" aria-live="assertive" to error container
  - Ensure error message is announced to screen readers
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 12. Implement FlipbookViewer empty state





  - Create empty state component with book illustration
  - Add title: "Dergi Sayfaları Bulunamadı"
  - Add description explaining the situation
  - Add refresh button with onClick handler
  - Ensure empty state is accessible with proper text
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

-

- [x] 13. Set up form validation with Zod and react-hook-form



  - Install zod and @hookform/resolvers packages
  - Create loginSchema with email and password validation rules
  - Integrate zodResolver with useForm hook
  - Implement real-time validation feedback
  - Display error messages with aria-invalid and aria-describedby
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 14. Implement login form validation and error display




  - Update login form to use react-hook-form with Zod schema
  - Add error message display for each field
  - Apply border-red-500 class to invalid fields
  - Add aria-invalid="true" and aria-describedby to inputs
  - Display error messages with role="alert"
  - Update submit button with loading state and spinner
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 15. Implement file upload validation in UploadDialog





  - Create validatePDF function checking type and size (100MB max)
  - Create validateCover function checking type and size (10MB max)
  - Add real-time validation on file selection
  - Display error or success feedback immediately
  - Show file name and size when valid
  - Add aria-invalid and aria-describedby to file inputs
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
- [x] 16. Implement issue number validation




- [ ] 16. Implement issue number validation

  - Add validation for range 1-9999
  - Check for duplicate issue numbers against existing magazines
  - Display error message for invalid or duplicate numbers
  - Add aria-invalid and aria-describedby to input
  - Show success indicator when valid
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
-

- [x] 17. Update MagazineGrid for mobile responsiveness




  - Add xs: 475px breakpoint to Tailwind config
  - Update grid columns: grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5
  - Update gap: gap-3 xs:gap-4 sm:gap-6 lg:gap-8
  - Ensure cards are properly sized on all breakpoints
  - _Requirements: 3.4, 3.5, 3.6_
-

- [x] 18. Update FlipbookViewer navigation buttons for touch targets




  - Increase button padding to p-3 md:p-4
  - Add min-w-[44px] min-h-[44px] classes
  - Add flex items-center justify-center for proper alignment
  - Reduce icon size to w-5 h-5 md:w-6 md:h-6 to maintain proportions
  - Ensure buttons meet 44x44px minimum touch target
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_
-

- [x] 19. Update admin page table for mobile overflow




  - Wrap MagazineTable in overflow-x-auto container
  - Add proper styling for horizontal scroll on mobile
  - Ensure table remains readable on small screens
  - _Requirements: 3.6_
-

- [x] 20. Implement button type standardization




  - Add type="button" to all non-form buttons
  - Add type="submit" to form submit buttons
  - Ensure smooth scroll buttons handle Enter/Space keys
  - Test keyboard navigation on all buttons
  - _Requirements: 1.6, 9.1, 9.2_

- [x] 21. Update color contrast for MagazineCard hover effects





  - Increase gradient overlay opacity to ensure text readability
  - Update border opacity from border-white/20 to border-white/40
  - Update corner decorations to border-white/60
  - Verify WCAG AA contrast ratio (4.5:1 for normal text)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
-

- [x] 22. Implement success feedback for upload completion




  - Display success toast with magazine title and issue number
  - Add optional action to view uploaded content
  - Close dialog automatically after success
  - Reset form for next upload
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ]* 23. Write accessibility tests for keyboard navigation
  - Test Tab navigation through all interactive elements
  - Test Arrow key navigation in FlipbookViewer
  - Test Enter/Space key on buttons
  - Verify focus indicators are visible
  - Test screen reader announcements with NVDA/JAWS
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ]* 24. Write tests for form validation
  - Test valid email and password inputs
  - Test invalid email format
  - Test password length validation
  - Test file type and size validation
  - Test issue number range and uniqueness
  - Verify error messages display correctly
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ]* 25. Write tests for error handling and recovery
  - Test network error categorization
  - Test file size error detection
  - Test server error handling
  - Test retry functionality
  - Test error message display
  - Verify recovery options work
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ]* 26. Write tests for responsive design
  - Test layout on xs (475px) breakpoint
  - Test layout on sm (640px) breakpoint
  - Test layout on md (768px) breakpoint
  - Test touch target sizes (44x44px minimum)
  - Test mobile keyboard interaction
  - Verify no layout shift on content load
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ]* 27. Write tests for loading states
  - Test skeleton screen displays correctly
  - Test loading state transitions
  - Test content displays after loading
  - Test error state displays on failure
  - Verify loading announcements to screen readers
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

