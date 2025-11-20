import type { Magazine } from '@/types/magazine'
import type { MagazineUploadData, ProcessedPage } from '@/types/upload'
import type { CreateMagazineDto } from '@/types/dtos'
import type { IStorageService } from '@/lib/services/storage/IStorageService'
import type { IMagazineRepository } from '@/lib/repositories/IMagazineRepository'
import type { FileProcessorFactory } from '@/lib/processors/FileProcessorFactory'
import { STORAGE_PATHS } from '@/lib/constants/storage'
import { UPLOAD_CONFIG } from '@/lib/constants/upload'

/**
 * Upload Service
 * 
 * Business logic layer for magazine upload operations.
 * Orchestrates file processing, storage uploads, and database record creation.
 * Supports progress tracking through callbacks.
 * 
 * @example
 * ```typescript
 * const service = new UploadService(storageService, repository, processorFactory)
 * const magazine = await service.uploadMagazine({
 *   pdf: pdfFile,
 *   cover: coverFile,
 *   title: 'Issue 1',
 *   issueNumber: 1,
 *   publicationDate: '2024-01-01',
 *   onPageProgress: (done, total) => console.log(`${done}/${total}`),
 *   onCoverProgress: (percent) => console.log(`${percent}%`)
 * })
 * ```
 */
export class UploadService {
  constructor(
    private storageService: IStorageService,
    private magazineRepository: IMagazineRepository,
    private fileProcessorFactory: FileProcessorFactory
  ) {}

  /**
   * Uploads a magazine by processing PDF pages, handling cover image,
   * uploading to storage, and creating database record
   * 
   * @param data - Magazine upload data including files and metadata
   * @returns Promise resolving to created magazine record
   * @throws {ProcessingError} If file processing fails
   * @throws {StorageError} If storage upload fails
   * @throws {DatabaseError} If database creation fails
   */
  async uploadMagazine(data: MagazineUploadData): Promise<Magazine> {
    const { pdf, cover, title, issueNumber, publicationDate, onPageProgress, onCoverProgress, onPdfProcessing } = data
    
    // Process PDF to pages
    const pages = await this.processPDFToPages(pdf, issueNumber, onPageProgress, onPdfProcessing)
    
    // Handle cover (custom or auto-generated from first page)
    const coverUrl = await this.handleCover(cover, pages[0], issueNumber, onCoverProgress)
    
    // Create database record
    const magazineDto: CreateMagazineDto = {
      title,
      issue_number: issueNumber,
      publication_date: publicationDate,
      cover_image_url: coverUrl,
      page_count: pages.length,
      is_published: true
    }
    
    return await this.magazineRepository.create(magazineDto)
  }

  /**
   * Processes a PDF file into individual page images and uploads them in parallel batches
   * Pages are processed first, then uploaded in parallel batches with retry logic
   * 
   * @param pdf - The PDF file to process
   * @param issueNumber - The magazine issue number for storage paths
   * @param onProgress - Optional callback for upload progress tracking
   * @param onPdfProcessing - Optional callback for PDF processing progress
   * @returns Promise resolving to array of processed pages
   * @throws {ProcessingError} If PDF processing fails
   * @throws {StorageError} If page upload fails after retries
   */
  private async processPDFToPages(
    pdf: File,
    issueNumber: number,
    onProgress?: (done: number, total: number) => void,
    onPdfProcessing?: (current: number, total: number) => void
  ): Promise<ProcessedPage[]> {
    // Get appropriate processor for the PDF file
    const processor = await this.fileProcessorFactory.getProcessor(pdf)
    
    const pages: ProcessedPage[] = []
    
    // First, process all PDF pages to blobs (without uploading)
    await processor.process(pdf, {
      targetHeight: UPLOAD_CONFIG.PDF.TARGET_HEIGHT,
      quality: UPLOAD_CONFIG.IMAGE.WEBP_QUALITY,
      onProgress: async (pageNumber: number, totalPages: number, blob: Blob) => {
        // Report processing progress
        if (onPdfProcessing) {
          onPdfProcessing(pageNumber, totalPages)
        }
        
        // Track processed page with path
        const pagePath = STORAGE_PATHS.getPagePath(issueNumber, pageNumber)
        pages.push({
          pageNumber,
          blob,
          path: pagePath
        })
      }
    })
    
    // Ensure we have pages
    if (pages.length === 0) {
      throw new Error('PDF processing returned no pages')
    }
    
    // Now upload pages in parallel batches
    await this.uploadPagesInBatches(pages, onProgress)
    
    return pages
  }

  /**
   * Uploads processed pages in parallel batches with retry logic
   * 
   * This method implements a batched parallel upload strategy:
   * 1. Pages are split into batches based on CONCURRENT_UPLOADS limit
   * 2. Each batch is processed sequentially to control resource usage
   * 3. Within each batch, pages are uploaded in parallel using Promise.allSettled
   * 4. Failed uploads are retried with exponential backoff (up to 3 attempts)
   * 5. All failures are collected and reported comprehensively
   * 
   * The concurrency limit (default: 5) balances upload speed with:
   * - Memory usage (each upload holds a blob in memory)
   * - Server load (simultaneous connections)
   * - Network stability (parallel requests)
   * 
   * @param pages - Array of processed pages to upload
   * @param onProgress - Optional callback for upload progress tracking
   * @throws {StorageError} If critical uploads fail after all retries
   */
  private async uploadPagesInBatches(
    pages: ProcessedPage[],
    onProgress?: (done: number, total: number) => void
  ): Promise<void> {
    // Concurrency limit for parallel uploads - configurable via UPLOAD_CONFIG
    const CONCURRENT_UPLOADS = UPLOAD_CONFIG.LIMITS.CONCURRENT_UPLOADS
    const totalPages = pages.length
    let completedPages = 0
    const failedUploads: Array<{ pageNumber: number; error: Error; attempts: number }> = []
    
    // Split pages into batches
    const batches: ProcessedPage[][] = []
    for (let i = 0; i < pages.length; i += CONCURRENT_UPLOADS) {
      batches.push(pages.slice(i, i + CONCURRENT_UPLOADS))
    }
    
    // Process each batch sequentially, but pages within batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      try {
        const batchResults = await Promise.allSettled(
          batch.map(async (page) => {
            try {
              // Upload with retry logic
              await this.uploadPageWithRetry(page)
              return { success: true, pageNumber: page.pageNumber }
            } catch (error) {
              return {
                success: false,
                pageNumber: page.pageNumber,
                error: error instanceof Error ? error : new Error('Unknown upload error')
              }
            }
          })
        )
        
        // Process batch results
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              completedPages++
              // Report progress for successful uploads
              if (onProgress) {
                onProgress(completedPages, totalPages)
              }
            } else {
              // Collect failed uploads with detailed information
              failedUploads.push({
                pageNumber: result.value.pageNumber,
                error: result.value.error || new Error('Unknown upload error'),
                attempts: 3 // Max retry attempts
              })
              console.error(
                `Page ${result.value.pageNumber} upload failed after retries:`,
                result.value.error
              )
            }
          } else {
            // Handle rejected promises (shouldn't happen with try-catch, but just in case)
            console.error('Unexpected batch promise rejection:', result.reason)
            failedUploads.push({
              pageNumber: 0, // Unknown page number
              error: result.reason instanceof Error ? result.reason : new Error('Batch promise rejected'),
              attempts: 0
            })
          }
        }
      } catch (batchError) {
        // Catch any unexpected errors during batch processing
        console.error(`Batch ${batchIndex + 1}/${batches.length} processing error:`, batchError)
        
        // Continue processing remaining batches
        batch.forEach(page => {
          failedUploads.push({
            pageNumber: page.pageNumber,
            error: batchError instanceof Error ? batchError : new Error('Batch processing error'),
            attempts: 0
          })
        })
      }
    }
    
    // Comprehensive error reporting for failed uploads
    if (failedUploads.length > 0) {
      const errorDetails = failedUploads
        .map(f => {
          const attemptInfo = f.attempts > 0 ? ` (${f.attempts} deneme sonrası)` : ''
          return `Sayfa ${f.pageNumber}${attemptInfo}: ${f.error.message}`
        })
        .join('\n  - ')
      
      const errorMessage = `${failedUploads.length}/${totalPages} sayfa yüklenemedi:\n  - ${errorDetails}`
      
      // Log comprehensive error report
      console.error('Upload batch failures:', {
        totalPages,
        failedCount: failedUploads.length,
        successCount: completedPages,
        failures: failedUploads
      })
      
      throw new Error(errorMessage)
    }
  }

  /**
   * Uploads a single page with exponential backoff retry logic
   * 
   * Retry strategy:
   * - Attempt 1: Immediate upload
   * - Attempt 2: Wait 1 second, retry
   * - Attempt 3: Wait 2 seconds, retry
   * - Attempt 4+: Wait 4 seconds, retry (if maxRetries > 3)
   * 
   * This exponential backoff helps handle temporary network issues
   * and server rate limiting without overwhelming the system.
   * 
   * @param page - The processed page to upload
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @throws {StorageError} If upload fails after all retries
   */
  private async uploadPageWithRetry(
    page: ProcessedPage,
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error = new Error('Upload failed after retries')
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.storageService.upload(page.path!, page.blob, {
          contentType: UPLOAD_CONFIG.IMAGE.FORMAT,
          upsert: true
        })
        // Success - exit retry loop
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          break
        }
        
        // Exponential backoff: wait 1s, 2s, 4s, etc.
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    
    // If we get here, all retries failed
    throw lastError
  }

  /**
   * Handles cover image upload - uses custom cover if provided,
   * otherwise uses the first page of the PDF
   * 
   * @param customCover - Optional custom cover image file
   * @param firstPage - The first page from PDF processing (fallback)
   * @param issueNumber - The magazine issue number for storage path
   * @param onProgress - Optional callback for progress tracking
   * @returns Promise resolving to the public URL of the uploaded cover
   * @throws {ProcessingError} If cover processing fails
   * @throws {StorageError} If cover upload fails
   */
  private async handleCover(
    customCover: File | null,
    firstPage: ProcessedPage,
    issueNumber: number,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const coverPath = STORAGE_PATHS.getCoverPath(issueNumber)
    
    // Report start of cover processing
    if (onProgress) {
      onProgress(0)
    }
    
    if (customCover) {
      // Process custom cover image
      const processor = await this.fileProcessorFactory.getProcessor(customCover)
      const result = await processor.process(customCover, {
        quality: UPLOAD_CONFIG.IMAGE.WEBP_QUALITY
      })
      
      // Report processing complete
      if (onProgress) {
        onProgress(50)
      }
      
      // Upload custom cover
      await this.storageService.upload(coverPath, result.blob, {
        contentType: UPLOAD_CONFIG.IMAGE.FORMAT,
        upsert: true
      })
    } else {
      // Use first page as cover
      await this.storageService.upload(coverPath, firstPage.blob, {
        contentType: UPLOAD_CONFIG.IMAGE.FORMAT,
        upsert: true
      })
    }
    
    // Report upload complete
    if (onProgress) {
      onProgress(100)
    }
    
    // Return public URL for the cover
    return this.storageService.getPublicUrl(coverPath)
  }
}
