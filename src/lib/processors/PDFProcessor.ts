import * as pdfjs from 'pdfjs-dist'
import { ProcessingError } from '@/lib/errors'
import { PDF_CONFIG, IMAGE_CONFIG } from '@/lib/constants/upload'
import { createRenderContext } from '@/types/pdfjs'
import type { IFileProcessor, ProcessOptions, ProcessResult, ProcessedPage } from './IFileProcessor'

/**
 * PDF File Processor
 * 
 * Processes PDF files by rendering each page to a canvas and converting
 * to WebP format. Implements the Strategy Pattern for file processing.
 */
export class PDFProcessor implements IFileProcessor {
  /**
   * Checks if this processor can handle the given file
   * 
   * @param file - The file to check
   * @returns true if the file is a PDF
   */
  canProcess(file: File): boolean {
    return file.type === 'application/pdf'
  }
  
  /**
   * Processes a PDF file by converting each page to WebP format
   * 
   * @param file - The PDF file to process
   * @param options - Processing options
   * @returns Promise resolving to the processing result with all pages
   * @throws {ProcessingError} If PDF loading or rendering fails
   */
  async process(file: File, options?: ProcessOptions): Promise<ProcessResult> {
    let pdfDoc: pdfjs.PDFDocumentProxy | null = null
    
    try {
      // Set PDF.js worker
      pdfjs.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_SRC
      
      // Load PDF document
      const pdfBuffer = await file.arrayBuffer()
      pdfDoc = await pdfjs.getDocument({ data: pdfBuffer }).promise
      
      const pages: ProcessedPage[] = []
      const targetHeight = options?.targetHeight ?? PDF_CONFIG.TARGET_HEIGHT
      const quality = options?.quality ?? IMAGE_CONFIG.WEBP_QUALITY
      const totalPages = pdfDoc.numPages
      
      // Process each page and stream to upload immediately
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i)
        const blob = await this.renderPageToBlob(page, targetHeight, quality)
        
        pages.push({
          pageNumber: i,
          blob
        })
        
        // Call progress callback with the processed blob (streaming)
        if (options?.onProgress) {
          await options.onProgress(i, totalPages, blob)
        }
        
        // Small delay every 5 pages to prevent UI freeze
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
      
      return {
        blob: pages[0].blob, // First page as primary
        pages,
        metadata: {
          pageCount: pdfDoc.numPages,
          fileName: file.name
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new ProcessingError(
          `PDF işleme başarısız: ${error.message}`,
          'pdf_processing',
          'PDF işlenirken bir hata oluştu',
          false,
          error
        )
      }
      throw new ProcessingError(
        'PDF işleme başarısız: Bilinmeyen hata',
        'pdf_processing',
        'PDF işlenirken bir hata oluştu',
        false,
        error
      )
    } finally {
      // Always cleanup PDF document resources, even on error
      if (pdfDoc) {
        pdfDoc.destroy()
        pdfDoc = null
      }
    }
  }
  
  /**
   * Renders a single PDF page to a WebP blob
   * 
   * @param page - The PDF page to render
   * @param targetHeight - Target height in pixels
   * @param quality - WebP quality (0.0 - 1.0)
   * @returns Promise resolving to the WebP blob
   * @throws {ProcessingError} If canvas context is unavailable or rendering fails
   */
  private async renderPageToBlob(
    page: pdfjs.PDFPageProxy,
    targetHeight: number,
    quality: number
  ): Promise<Blob> {
    let canvas: HTMLCanvasElement | null = document.createElement('canvas')
    let ctx: CanvasRenderingContext2D | null = canvas.getContext(PDF_CONFIG.CONTEXT_TYPE)
    
    if (!ctx) {
      throw new ProcessingError(
        'Canvas context unavailable',
        'pdf_processing',
        'PDF işlenirken bir hata oluştu'
      )
    }
    
    try {
      // Calculate scale to achieve target height
      const viewport = page.getViewport({ scale: 1 })
      const scale = targetHeight / viewport.height
      const scaledViewport = page.getViewport({ scale })
      
      canvas.width = Math.ceil(scaledViewport.width)
      canvas.height = Math.ceil(scaledViewport.height)
      
      // Render PDF page to canvas using type-safe render context
      const renderContext = createRenderContext(ctx, scaledViewport, canvas)
      await page.render(renderContext).promise
      
      // Convert canvas to WebP blob
      return await this.canvasToBlob(canvas, quality)
    } finally {
      // Cleanup canvas resources
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
        ctx = null
        canvas = null
      }
    }
  }
  
  /**
   * Converts a canvas to a WebP blob with proper null handling
   * 
   * @param canvas - The canvas to convert
   * @param quality - WebP quality (0.0 - 1.0)
   * @returns Promise resolving to the WebP blob
   * @throws {ProcessingError} If canvas is null or blob conversion fails
   */
  private canvasToBlob(canvas: HTMLCanvasElement | null, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!canvas) {
        reject(new ProcessingError(
          'Canvas is null',
          'pdf_processing',
          'PDF dönüştürülürken bir hata oluştu'
        ))
        return
      }
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new ProcessingError(
              'Failed to convert canvas to blob',
              'pdf_processing',
              'PDF dönüştürülürken bir hata oluştu'
            ))
          }
        },
        IMAGE_CONFIG.FORMAT,
        quality
      )
    })
  }
}
