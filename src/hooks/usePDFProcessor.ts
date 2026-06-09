import { useState, useCallback, useRef } from 'react'
import type * as PDFJSType from 'pdfjs-dist'
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

export function usePDFProcessor(): UsePDFProcessorReturn {
  const [totalPages, setTotalPages] = useState<number>(0)
  const [processedPages, setProcessedPages] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  // Use ref to store PDF document so it persists across renders
  // and can be properly cleaned up
  const pdfDocRef = useRef<PDFJSType.PDFDocumentProxy | null>(null)

  /**
   * Renders a single PDF page to a WebP blob
   */
  const renderPageToBlob = useCallback(
    async (
      page: PDFJSType.PDFPageProxy,
      targetHeight: number,
      quality: number
    ): Promise<Blob> => {
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
        // Calculate scale to achieve target height
        const viewport = page.getViewport({ scale: 1 })
        const scale = validatedTargetHeight / viewport.height
        const scaledViewport = page.getViewport({ scale })

        canvas.width = Math.ceil(scaledViewport.width)
        canvas.height = Math.ceil(scaledViewport.height)

        const renderContext = createRenderContext(canvasContext, scaledViewport, canvas)
        await page.render(renderContext).promise

        return await createStandardizedPromise<Blob>(
          (resolve, reject) => {
            if (!canvas) {
              reject(new Error('Canvas is null'))
              return
            }

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob)
                } else {
                  reject(new Error('Failed to convert canvas to blob'))
                }
              },
              IMAGE_CONFIG.FORMAT,
              validatedQuality
            )

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

  const processPDF = useCallback(
    async (file: File, options?: PDFProcessorOptions): Promise<ProcessedPDF> => {
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

      setProcessedPages(0)
      setTotalPages(0)
      setIsProcessing(true)
      setError(null)

      logger.info('Starting PDF processing with dynamic pdfjs-dist', {
        hook: 'usePDFProcessor',
        operation: 'processPDF',
        fileName: file.name,
        fileSize: file.size
      })

      try {
        const processingResult = await executeAsyncOperation(
          async () => {
            // 1. Dynamically import pdfjs-dist
            const pdfjs = await import('pdfjs-dist')
            pdfjs.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_SRC

            const pdfBuffer = await file.arrayBuffer()
            const pdfDoc = await pdfjs.getDocument({ data: pdfBuffer }).promise
            pdfDocRef.current = pdfDoc

            const numPages = ValidationHelpers.validateOrThrow(
              pdfDoc.numPages,
              TypeGuards.isPositiveInteger,
              'positive integer',
              'pdfDoc.numPages'
            )

            setTotalPages(numPages)

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

            const pages: Blob[] = new Array(numPages)
            let completedCount = 0

            // Helper task to execute page rendering and clean up resources immediately
            const renderTask = async (pageNumber: number) => {
              const pdfPage = await pdfDoc.getPage(pageNumber)
              try {
                const pageBlob = await renderPageToBlob(pdfPage, targetHeight, quality)
                pages[pageNumber - 1] = pageBlob
                completedCount++
                setProcessedPages(completedCount)

                if (options?.onProgress && typeof options.onProgress === 'function') {
                  try {
                    options.onProgress(completedCount, numPages)
                  } catch {
                    // Ignore callback error
                  }
                }
              } finally {
                // 3. Immediately dispose page resources to save memory
                try {
                  pdfPage.cleanup()
                } catch {
                  // Silently ignore cleanup errors
                }
              }
            }

            // 4. Concurrency pool limiting concurrent page rendering to 3
            const limit = 3
            const executing: Promise<void>[] = []
            
            for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
              const p = renderTask(pageNumber)
              executing.push(p)
              
              if (executing.length >= limit) {
                // Wait for the fastest task to complete before starting next one
                await Promise.race(executing.map(pRef => pRef.catch(() => {})))
                // Clean up references to completed promises in list
                // (Using index filter of resolving promises)
              }
              
              // Evict finished promises
              p.then(() => {
                const idx = executing.indexOf(p)
                if (idx > -1) executing.splice(idx, 1)
              }).catch(() => {
                const idx = executing.indexOf(p)
                if (idx > -1) executing.splice(idx, 1)
              })
            }
            
            // Wait for all remaining active rendering tasks
            await Promise.all(executing)

            return {
              pages: pages.filter(Boolean),
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

        return processingResult.data
      } catch (err) {
        const processingError = ErrorHandler.handleUnknownError(err)
        setError(processingError)
        throw processingError
      } finally {
        if (pdfDocRef.current) {
          try {
            pdfDocRef.current.destroy()
            pdfDocRef.current = null
          } catch (cleanupError) {
            logger.warn('PDF document cleanup failed', {
              hook: 'usePDFProcessor',
              error: cleanupError
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
