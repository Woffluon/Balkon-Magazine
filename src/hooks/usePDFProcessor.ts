import { useState, useCallback, useRef } from 'react'
import * as pdfjs from 'pdfjs-dist'
import { PDF_CONFIG, IMAGE_CONFIG } from '@/lib/constants/upload'
import { createRenderContext } from '@/types/pdfjs'
import { logger } from '@/lib/services/Logger'
import { ErrorHandler } from '@/lib/errors/errorHandler'
import { executeAsyncOperation, createStandardizedPromise } from '@/lib/utils/asyncPatterns'
import { TypeGuards, ValidationHelpers } from '@/lib/guards/runtimeTypeGuards'
import { APP_CONFIG } from '@/lib/config/app-config'

/**
 * Processed PDF result interface
 * Contains all extracted pages as blobs
 */
export interface ProcessedPDF {
  /** Array of page blobs in order */
  pages: Blob[]
  /** Total number of pages in the PDF */
  totalPages: number
}

/**
 * PDF processor options interface
 * Configures PDF processing behavior
 */
export interface PDFProcessorOptions {
  /** Target height for rendered pages in pixels */
  targetHeight?: number
  /** WebP quality (0.0 - 1.0) */
  quality?: number
  /** Progress callback called after each page is processed */
  onProgress?: (current: number, total: number) => void
}

/**
 * PDF processor return interface
 * Provides PDF processing function and state tracking
 */
export interface UsePDFProcessorReturn {
  /** Processes a PDF file and extracts pages as images */
  processPDF: (file: File, options?: PDFProcessorOptions) => Promise<ProcessedPDF>
  /** Total number of pages in the current/last PDF */
  totalPages: number
  /** Number of pages processed so far */
  processedPages: number
  /** Whether PDF processing is currently in progress */
  isProcessing: boolean
  /** The last error that occurred during processing, or null */
  error: Error | null
}

/**
 * Custom hook for PDF processing with progress tracking
 * 
 * Encapsulates PDF parsing logic using pdf.js, extracting pages as WebP images
 * with efficient memory management and progress tracking.
 * 
 * Satisfies Requirement 2.2: PDF parsing, page extraction as images,
 * progress tracking, and efficient memory handling
 * 
 * @returns PDF processing function and state tracking
 * 
 * @example
 * ```tsx
 * function PDFUploader() {
 *   const { processPDF, totalPages, processedPages, isProcessing, error } = usePDFProcessor()
 *   
 *   const handlePDFUpload = async (file: File) => {
 *     try {
 *       const result = await processPDF(file, {
 *         targetHeight: 2000,
 *         quality: 0.85,
 *         onProgress: (current, total) => {
 *           console.log(`Processing page ${current}/${total}`)
 *         }
 *       })
 *       
 *       console.log(`Extracted ${result.pages.length} pages`)
 *       // Upload pages...
 *     } catch (err) {
 *       console.error('PDF processing failed:', err)
 *     }
 *   }
 *   
 *   return (
 *     <div>
 *       <input type="file" accept="application/pdf" onChange={(e) => {
 *         const file = e.target.files?.[0]
 *         if (file) handlePDFUpload(file)
 *       }} />
 *       {isProcessing && (
 *         <div>Processing: {processedPages}/{totalPages} pages</div>
 *       )}
 *       {error && <div>Error: {error.message}</div>}
 *     </div>
 *   )
 * }
 * ```
 */
export function usePDFProcessor(): UsePDFProcessorReturn {
  const [totalPages, setTotalPages] = useState<number>(0)
  const [processedPages, setProcessedPages] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Use ref to store PDF document so it persists across renders
  // and can be properly cleaned up
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null)

  /**
   * Renders a single PDF page to a WebP blob
   * 
   * Creates a canvas, renders the PDF page to it, and converts to WebP format.
   * Properly cleans up canvas resources after conversion to prevent memory leaks.
   * 
   * @param page - The PDF page to render
   * @param targetHeight - Target height in pixels
   * @param quality - WebP quality (0.0 - 1.0)
   * @returns Promise resolving to the WebP blob
   * @throws {Error} If canvas context is unavailable or rendering fails
   */
  const renderPageToBlob = useCallback(
    async (
      page: pdfjs.PDFPageProxy,
      targetHeight: number,
      quality: number
    ): Promise<Blob> => {
      // Validate inputs using type guards (Requirement 7.2)
      const validatedTargetHeight = ValidationHelpers.validateOrThrow(
        targetHeight,
        TypeGuards.isPositiveNumber,
        'positive number',
        'renderPageToBlob.targetHeight'
      )
      
      const validatedQuality = ValidationHelpers.validateOrThrow(
        quality,
        (value): value is number => TypeGuards.isNumber(value) && value >= 0 && value <= 1,
        'number between 0 and 1',
        'renderPageToBlob.quality'
      )

      let canvas: HTMLCanvasElement | null = document.createElement('canvas')
      let canvasContext: CanvasRenderingContext2D | null = canvas.getContext(PDF_CONFIG.CONTEXT_TYPE)
      
      if (!canvasContext) {
        const error = new Error('Canvas context unavailable')
        logger.error('Canvas context creation failed', {
          hook: 'usePDFProcessor',
          operation: 'renderPageToBlob',
          error: error.message
        })
        throw error
      }
      
      try {
        logger.debug('Starting PDF page render', {
          hook: 'usePDFProcessor',
          operation: 'renderPageToBlob',
          targetHeight: validatedTargetHeight,
          quality: validatedQuality
        })

        // Calculate scale to achieve target height
        const viewport = page.getViewport({ scale: 1 })
        const scale = validatedTargetHeight / viewport.height
        const scaledViewport = page.getViewport({ scale })
        
        canvas.width = Math.ceil(scaledViewport.width)
        canvas.height = Math.ceil(scaledViewport.height)
        
        logger.debug('Canvas dimensions calculated', {
          hook: 'usePDFProcessor',
          operation: 'renderPageToBlob',
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          scale
        })
        
        // Render PDF page to canvas using type-safe render context
        const renderContext = createRenderContext(canvasContext, scaledViewport, canvas)
        await page.render(renderContext).promise
        
        // Convert canvas to WebP blob with standardized promise handling (Requirement 7.3)
        return await createStandardizedPromise<Blob>(
          (resolve, reject) => {
            if (!canvas) {
              reject(new Error('Canvas is null'))
              return
            }
            
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  logger.debug('Canvas converted to blob successfully', {
                    hook: 'usePDFProcessor',
                    operation: 'renderPageToBlob',
                    blobSize: blob.size,
                    blobType: blob.type
                  })
                  resolve(blob)
                } else {
                  reject(new Error('Failed to convert canvas to blob'))
                }
              },
              IMAGE_CONFIG.FORMAT,
              validatedQuality
            )
            
            // Return cleanup function
            return () => {
              if (canvas) {
                canvas.width = 0
                canvas.height = 0
              }
            }
          },
          {
            timeout: APP_CONFIG.system.performance.maxExecutionTime,
            context: {
              hook: 'usePDFProcessor',
              operation: 'canvasToBlob',
              canvasWidth: canvas.width,
              canvasHeight: canvas.height
            }
          }
        )
      } finally {
        // Cleanup canvas resources to prevent memory leaks
        if (canvas) {
          canvas.width = 0
          canvas.height = 0
          canvasContext = null
          canvas = null
        }
      }
    },
    []
  )

  /**
   * Processes a PDF file and extracts all pages as WebP images
   * 
   * Loads the PDF using pdf.js, renders each page to a canvas, and converts
   * to WebP format. Tracks progress and handles memory efficiently by cleaning
   * up resources after each page.
   * 
   * @param file - The PDF file to process
   * @param options - Processing options
   * @returns Promise resolving to the processed PDF with all pages
   * @throws {Error} If PDF loading or rendering fails
   */
  const processPDF = useCallback(
    async (file: File, options?: PDFProcessorOptions): Promise<ProcessedPDF> => {
      // Validate inputs using type guards (Requirement 7.2)
      if (!TypeGuards.isFile(file)) {
        const error = new Error('Invalid file parameter: must be File instance')
        logger.error('PDF processing validation failed', {
          hook: 'usePDFProcessor',
          operation: 'processPDF',
          error: error.message,
          fileType: typeof file
        })
        throw error
      }

      // Reset state for new processing
      setProcessedPages(0)
      setTotalPages(0)
      setIsProcessing(true)
      setError(null)

      logger.info('Starting PDF processing', {
        hook: 'usePDFProcessor',
        operation: 'processPDF',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })

      try {
        // Execute PDF processing with standardized async patterns (Requirement 7.1)
        const processingResult = await executeAsyncOperation(
          async () => {
            // Set PDF.js worker
            pdfjs.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_SRC
            
            // Load PDF document
            const pdfBuffer = await file.arrayBuffer()
            const pdfDoc = await pdfjs.getDocument({ data: pdfBuffer }).promise
            pdfDocRef.current = pdfDoc
            
            const pages: Blob[] = []
            
            // Validate processing options with type guards
            const targetHeight = ValidationHelpers.validateOrDefault(
              options?.targetHeight,
              TypeGuards.isPositiveNumber,
              PDF_CONFIG.TARGET_HEIGHT,
              'options.targetHeight'
            )
            
            const quality = ValidationHelpers.validateOrDefault(
              options?.quality,
              (value): value is number => TypeGuards.isNumber(value) && value >= 0 && value <= 1,
              IMAGE_CONFIG.WEBP_QUALITY,
              'options.quality'
            )
            
            const numPages = ValidationHelpers.validateOrThrow(
              pdfDoc.numPages,
              TypeGuards.isPositiveInteger,
              'positive integer',
              'pdfDoc.numPages'
            )
            
            setTotalPages(numPages)
            
            logger.info('PDF document loaded successfully', {
              hook: 'usePDFProcessor',
              operation: 'processPDF',
              numPages,
              targetHeight,
              quality
            })
            
            // Process each page with proper error handling
            for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
              try {
                const pdfPage = await pdfDoc.getPage(pageNumber)
                const pageBlob = await renderPageToBlob(pdfPage, targetHeight, quality)
                
                pages.push(pageBlob)
                setProcessedPages(pageNumber)
                
                logger.debug('PDF page processed successfully', {
                  hook: 'usePDFProcessor',
                  operation: 'processPDF',
                  pageNumber,
                  totalPages: numPages,
                  blobSize: pageBlob.size
                })
                
                // Call progress callback with validation
                if (options?.onProgress && typeof options.onProgress === 'function') {
                  try {
                    options.onProgress(pageNumber, numPages)
                  } catch (callbackError) {
                    logger.warn('Progress callback failed', {
                      hook: 'usePDFProcessor',
                      operation: 'processPDF',
                      pageNumber,
                      error: callbackError instanceof Error ? callbackError.message : String(callbackError)
                    })
                  }
                }
                
                // Small delay every 5 pages to prevent UI freeze
                if (pageNumber % 5 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 10))
                }
              } catch (pageError) {
                const handledError = ErrorHandler.handleUnknownError(pageError)
                logger.error('PDF page processing failed', {
                  hook: 'usePDFProcessor',
                  operation: 'processPDF',
                  pageNumber,
                  error: handledError.message
                })
                throw handledError
              }
            }
            
            return {
              pages,
              totalPages: numPages
            }
          },
          {
            hook: 'usePDFProcessor',
            operation: 'processPDFDocument',
            fileName: file.name,
            fileSize: file.size
          }
        )

        if (!processingResult.success) {
          throw processingResult.error
        }

        logger.info('PDF processing completed successfully', {
          hook: 'usePDFProcessor',
          operation: 'processPDF',
          fileName: file.name,
          totalPages: processingResult.data.totalPages,
          pagesProcessed: processingResult.data.pages.length
        })

        return processingResult.data
      } catch (err) {
        // Handle errors with standardized error handling (Requirement 4.1)
        const processingError = ErrorHandler.handleUnknownError(err)
        
        logger.error('PDF processing failed', {
          hook: 'usePDFProcessor',
          operation: 'processPDF',
          fileName: file.name,
          fileSize: file.size,
          error: processingError.message,
          userMessage: processingError.userMessage
        })
        
        setError(processingError)
        throw processingError
      } finally {
        // Always cleanup PDF document resources
        if (pdfDocRef.current) {
          try {
            pdfDocRef.current.destroy()
            pdfDocRef.current = null
            
            logger.debug('PDF document resources cleaned up', {
              hook: 'usePDFProcessor',
              operation: 'processPDF',
              fileName: file.name
            })
          } catch (cleanupError) {
            logger.warn('PDF document cleanup failed', {
              hook: 'usePDFProcessor',
              operation: 'processPDF',
              fileName: file.name,
              error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
            })
          }
        }
        setIsProcessing(false)
      }
    },
    [renderPageToBlob]
  )

  return {
    processPDF,
    totalPages,
    processedPages,
    isProcessing,
    error
  }
}
