import { ProcessingError } from '@/lib/errors'
import type { IFileProcessor } from './IFileProcessor'
import { ImageProcessor } from './ImageProcessor'

/**
 * File Processor Factory
 * 
 * Factory class that selects the appropriate file processor based on file type.
 * Implements the Factory Pattern and supports the Open/Closed Principle by
 * allowing new processors to be registered without modifying existing code.
 * 
 * PDFProcessor is lazy-loaded to avoid server-side rendering issues with pdfjs-dist.
 */
export class FileProcessorFactory {
  private processors: IFileProcessor[]
  private pdfProcessorLoaded = false
  
  /**
   * Creates a new FileProcessorFactory with default processors
   * Default processors: ImageProcessor (PDFProcessor is lazy-loaded)
   */
  constructor() {
    this.processors = [
      new ImageProcessor()
    ]
  }
  
  /**
   * Lazy loads the PDFProcessor (client-side only)
   * This prevents server-side rendering issues with pdfjs-dist
   */
  private async loadPDFProcessor(): Promise<void> {
    if (this.pdfProcessorLoaded) return
    
    // Only load on client-side
    if (typeof window !== 'undefined') {
      const { PDFProcessor } = await import('./PDFProcessor')
      this.processors.push(new PDFProcessor())
      this.pdfProcessorLoaded = true
    }
  }
  
  /**
   * Gets the appropriate processor for the given file
   * 
   * @param file - The file to process
   * @returns The processor that can handle the file
   * @throws {ProcessingError} If no processor can handle the file type
   */
  async getProcessor(file: File): Promise<IFileProcessor> {
    // Load PDF processor if needed
    if (file.type === 'application/pdf') {
      await this.loadPDFProcessor()
    }
    
    const processor = this.processors.find(p => p.canProcess(file))
    
    if (!processor) {
      throw new ProcessingError(
        `No processor found for file type: ${file.type}. Supported types: PDF, images (JPEG, PNG, WebP, etc.)`,
        'file_validation',
        'Desteklenmeyen dosya türü'
      )
    }
    
    return processor
  }
  
  /**
   * Registers a new processor
   * 
   * This method allows extending the factory with new file processors
   * without modifying the factory class itself (Open/Closed Principle).
   * 
   * @param processor - The processor to register
   * 
   * @example
   * ```typescript
   * const factory = new FileProcessorFactory()
   * factory.registerProcessor(new CustomVideoProcessor())
   * ```
   */
  registerProcessor(processor: IFileProcessor): void {
    this.processors.push(processor)
  }
  
  /**
   * Gets all registered processors
   * 
   * @returns Array of all registered processors
   */
  getProcessors(): IFileProcessor[] {
    return [...this.processors]
  }
  
  /**
   * Checks if a file can be processed by any registered processor
   * 
   * @param file - The file to check
   * @returns true if at least one processor can handle the file
   */
  canProcess(file: File): boolean {
    return this.processors.some(p => p.canProcess(file))
  }
}
