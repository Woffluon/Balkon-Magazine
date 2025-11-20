/**
 * File Processor Interface
 * 
 * Defines the contract for file processors that convert files to WebP format.
 * Implements the Strategy Pattern to allow different processing strategies
 * for different file types (PDF, images, etc.)
 */

/**
 * Options for file processing
 */
export interface ProcessOptions {
  /** WebP quality (0.0 - 1.0) */
  quality?: number
  
  /** Target height in pixels for rendering */
  targetHeight?: number
  
  /** Target width in pixels for rendering */
  targetWidth?: number
  
  /** Progress callback for multi-page processing - called after each page is processed
   * @param current - Current page number
   * @param total - Total number of pages
   * @param blob - The processed blob for this page
   */
  onProgress?: (current: number, total: number, blob: Blob) => void | Promise<void>
}

/**
 * Result of file processing
 */
export interface ProcessResult {
  /** Primary processed blob (first page or single image) */
  blob: Blob
  
  /** Array of processed pages (for multi-page documents like PDFs) */
  pages?: ProcessedPage[]
  
  /** Additional metadata about the processing */
  metadata?: Record<string, unknown>
}

/**
 * Represents a single processed page
 */
export interface ProcessedPage {
  /** Page number (1-indexed) */
  pageNumber: number
  
  /** Processed image blob */
  blob: Blob
  
  /** Optional storage path for the page */
  path?: string
}

/**
 * File Processor Interface
 * 
 * Implementations of this interface handle conversion of specific file types
 * to WebP format for storage and display.
 */
export interface IFileProcessor {
  /**
   * Determines if this processor can handle the given file
   * 
   * @param file - The file to check
   * @returns true if this processor can process the file
   */
  canProcess(file: File): boolean
  
  /**
   * Processes the file and converts it to WebP format
   * 
   * @param file - The file to process
   * @param options - Processing options
   * @returns Promise resolving to the processing result
   * @throws {ProcessingError} If processing fails
   */
  process(file: File, options?: ProcessOptions): Promise<ProcessResult>
}
