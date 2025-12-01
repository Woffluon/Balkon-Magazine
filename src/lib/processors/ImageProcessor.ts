import { ProcessingError } from '@/lib/errors'
import { IMAGE_CONFIG, PDF_CONFIG } from '@/lib/constants/upload'
import type { IFileProcessor, ProcessOptions, ProcessResult } from './IFileProcessor'

/**
 * Image File Processor
 * 
 * Processes image files by converting them to WebP format.
 * Implements the Strategy Pattern for file processing.
 * Supports JPEG, PNG, and other browser-supported image formats.
 */
export class ImageProcessor implements IFileProcessor {
  /**
   * Checks if this processor can handle the given file
   * 
   * @param file - The file to check
   * @returns true if the file is an image
   */
  canProcess(file: File): boolean {
    return file.type.startsWith('image/')
  }
  
  /**
   * Processes an image file by converting it to WebP format
   * 
   * @param file - The image file to process
   * @param options - Processing options
   * @returns Promise resolving to the processing result
   * @throws {ProcessingError} If image loading or conversion fails
   */
  async process(file: File, options?: ProcessOptions): Promise<ProcessResult> {
    const quality = options?.quality ?? IMAGE_CONFIG.WEBP_QUALITY
    const url = URL.createObjectURL(file)
    
    try {
      // Load image
      const img = await this.loadImage(url)
      
      // Create canvas with image dimensions
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      
      // Get canvas context
      const ctx = canvas.getContext(PDF_CONFIG.CONTEXT_TYPE)
      if (!ctx) {
        throw new ProcessingError(
          'Canvas context unavailable',
          'image_conversion',
          'Görüntü işlenirken bir hata oluştu'
        )
      }
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0)
      
      // Convert to WebP blob
      const blob = await this.canvasToBlob(canvas, quality)
      
      return {
        blob,
        metadata: {
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          originalType: file.type,
          fileName: file.name
        }
      }
    } catch (error) {
      if (error instanceof ProcessingError) {
        throw error
      }
      if (error instanceof Error) {
        throw new ProcessingError(
          `Image processing failed: ${error.message}`,
          'image_conversion',
          'Görüntü işlenirken bir hata oluştu',
          false,
          error
        )
      }
      throw new ProcessingError(
        'Image processing failed: Unknown error',
        'image_conversion',
        'Görüntü işlenirken bir hata oluştu',
        false,
        error
      )
    } finally {
      // Clean up object URL
      URL.revokeObjectURL(url)
    }
  }
  
  /**
   * Loads an image from a URL
   * 
   * @param url - The image URL (typically an object URL)
   * @returns Promise resolving to the loaded image
   * @throws {ProcessingError} If image fails to load
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => resolve(img)
      img.onerror = () => reject(new ProcessingError(
        'Failed to load image',
        'image_conversion',
        'Görüntü yüklenirken bir hata oluştu'
      ))
      
      img.src = url
    })
  }
  
  /**
   * Converts a canvas to a WebP blob
   * 
   * @param canvas - The canvas to convert
   * @param quality - WebP quality (0.0 - 1.0)
   * @returns Promise resolving to the WebP blob
   */
  private canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new ProcessingError(
              'Failed to convert canvas to blob',
              'image_conversion',
              'Görüntü dönüştürülürken bir hata oluştu'
            ))
          }
        },
        IMAGE_CONFIG.FORMAT,
        quality
      )
    })
  }
}
