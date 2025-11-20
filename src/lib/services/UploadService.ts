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
   * Processes a PDF file into individual page images and uploads them in parallel
   * Each page is uploaded immediately after being processed (streaming approach)
   * 
   * @param pdf - The PDF file to process
   * @param issueNumber - The magazine issue number for storage paths
   * @param onProgress - Optional callback for upload progress tracking
   * @param onPdfProcessing - Optional callback for PDF processing progress
   * @returns Promise resolving to array of processed pages
   * @throws {ProcessingError} If PDF processing fails
   * @throws {StorageError} If page upload fails
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
    
    // Process PDF with streaming - upload each page as it's processed
    await processor.process(pdf, {
      targetHeight: UPLOAD_CONFIG.PDF.TARGET_HEIGHT,
      quality: UPLOAD_CONFIG.IMAGE.WEBP_QUALITY,
      onProgress: async (pageNumber: number, totalPages: number, blob: Blob) => {
        // Report processing progress
        if (onPdfProcessing) {
          onPdfProcessing(pageNumber, totalPages)
        }
        
        // Upload page immediately after processing
        const pagePath = STORAGE_PATHS.getPagePath(issueNumber, pageNumber)
        await this.storageService.upload(pagePath, blob, {
          contentType: UPLOAD_CONFIG.IMAGE.FORMAT,
          upsert: true
        })
        
        // Track processed page
        pages.push({
          pageNumber,
          blob,
          path: pagePath
        })
        
        // Report upload progress
        if (onProgress) {
          onProgress(pageNumber, totalPages)
        }
      }
    })
    
    // Ensure we have pages
    if (pages.length === 0) {
      throw new Error('PDF processing returned no pages')
    }
    
    return pages
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
