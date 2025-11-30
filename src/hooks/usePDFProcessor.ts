import { useState, useCallback, useRef } from 'react'
import * as pdfjs from 'pdfjs-dist'
import { PDF_CONFIG, IMAGE_CONFIG } from '@/lib/constants/upload'

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
      let canvas: HTMLCanvasElement | null = document.createElement('canvas')
      let ctx: CanvasRenderingContext2D | null = canvas.getContext(PDF_CONFIG.CONTEXT_TYPE)
      
      if (!ctx) {
        throw new Error('Canvas context unavailable')
      }
      
      try {
        // Calculate scale to achieve target height
        const viewport = page.getViewport({ scale: 1 })
        const scale = targetHeight / viewport.height
        const scaledViewport = page.getViewport({ scale })
        
        canvas.width = Math.ceil(scaledViewport.width)
        canvas.height = Math.ceil(scaledViewport.height)
        
        // Render PDF page to canvas
        const renderContext = {
          canvasContext: ctx,
          viewport: scaledViewport,
          canvas: canvas
        }
        await page.render(renderContext).promise
        
        // Convert canvas to WebP blob
        return await new Promise<Blob>((resolve, reject) => {
          canvas!.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to convert canvas to blob'))
              }
            },
            IMAGE_CONFIG.FORMAT,
            quality
          )
        })
      } finally {
        // Cleanup canvas resources to prevent memory leaks
        if (canvas) {
          canvas.width = 0
          canvas.height = 0
          ctx = null
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
      // Reset state for new processing
      setProcessedPages(0)
      setTotalPages(0)
      setIsProcessing(true)
      setError(null)

      try {
        // Set PDF.js worker
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_SRC
        
        // Load PDF document
        const pdfBuffer = await file.arrayBuffer()
        const pdfDoc = await pdfjs.getDocument({ data: pdfBuffer }).promise
        pdfDocRef.current = pdfDoc
        
        const pages: Blob[] = []
        const targetHeight = options?.targetHeight ?? PDF_CONFIG.TARGET_HEIGHT
        const quality = options?.quality ?? IMAGE_CONFIG.WEBP_QUALITY
        const numPages = pdfDoc.numPages
        
        setTotalPages(numPages)
        
        // Process each page
        for (let i = 1; i <= numPages; i++) {
          const page = await pdfDoc.getPage(i)
          const blob = await renderPageToBlob(page, targetHeight, quality)
          
          pages.push(blob)
          setProcessedPages(i)
          
          // Call progress callback
          if (options?.onProgress) {
            options.onProgress(i, numPages)
          }
          
          // Small delay every 5 pages to prevent UI freeze
          if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10))
          }
        }
        
        return {
          pages,
          totalPages: numPages
        }
      } catch (err) {
        const processingError = err instanceof Error 
          ? err 
          : new Error('PDF processing failed: Unknown error')
        
        setError(processingError)
        throw processingError
      } finally {
        // Always cleanup PDF document resources
        if (pdfDocRef.current) {
          pdfDocRef.current.destroy()
          pdfDocRef.current = null
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
