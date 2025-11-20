/**
 * File Processors Module
 * 
 * Provides file processing functionality using the Strategy Pattern.
 * Supports PDF and image conversion to WebP format.
 */

// Interfaces and types
export type {
  IFileProcessor,
  ProcessOptions,
  ProcessResult,
  ProcessedPage
} from './IFileProcessor'

// Processor implementations
export { PDFProcessor } from './PDFProcessor'
export { ImageProcessor } from './ImageProcessor'

// Factory
export { FileProcessorFactory } from './FileProcessorFactory'
