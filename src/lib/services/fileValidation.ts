/**
 * File Validation Service
 * 
 * Provides security-focused file validation including:
 * - Magic number (file signature) validation
 * - MIME type validation
 * - File size validation
 */

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * Magic number signatures for supported file types
 */
const MAGIC_NUMBERS = {
  PDF: new Uint8Array([0x25, 0x50, 0x44, 0x46]), // %PDF
  PNG: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), // PNG signature
  JPEG: new Uint8Array([0xff, 0xd8, 0xff]), // JPEG signature
  WEBP_RIFF: new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF
  WEBP_WEBP: new Uint8Array([0x57, 0x45, 0x42, 0x50]), // WEBP (at offset 8)
} as const

/**
 * File size limits in bytes
 */
export const FILE_SIZE_LIMITS = {
  PDF: 50 * 1024 * 1024, // 50MB
  IMAGE: 10 * 1024 * 1024, // 10MB
} as const

/**
 * Allowed MIME types
 */
export const ALLOWED_MIME_TYPES = {
  PDF: ['application/pdf'],
  IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
} as const

/**
 * Read the first N bytes from a file
 */
async function readFileBytes(file: File, numBytes: number): Promise<Uint8Array> {
  const slice = file.slice(0, numBytes)
  const buffer = await slice.arrayBuffer()
  return new Uint8Array(buffer)
}

/**
 * Compare two Uint8Arrays for equality
 */
function bytesMatch(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  return a.every((byte, index) => byte === b[index])
}

/**
 * Validate PDF file by checking magic number
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export async function validatePDF(file: File): Promise<FileValidationResult> {
  try {
    const bytes = await readFileBytes(file, 4)
    
    if (!bytesMatch(bytes, MAGIC_NUMBERS.PDF)) {
      return {
        valid: false,
        error: 'Invalid PDF file format',
      }
    }
    
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to read file',
    }
  }
}

/**
 * Validate image file by checking magic numbers for PNG, JPEG, or WebP
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export async function validateImage(file: File): Promise<FileValidationResult> {
  try {
    // Read enough bytes to check all image formats
    const bytes = await readFileBytes(file, 12)
    
    // Check PNG
    if (bytes.length >= 4) {
      const pngSignature = bytes.slice(0, 4)
      if (bytesMatch(pngSignature, MAGIC_NUMBERS.PNG)) {
        return { valid: true }
      }
    }
    
    // Check JPEG
    if (bytes.length >= 3) {
      const jpegSignature = bytes.slice(0, 3)
      if (bytesMatch(jpegSignature, MAGIC_NUMBERS.JPEG)) {
        return { valid: true }
      }
    }
    
    // Check WebP (RIFF at start, WEBP at offset 8)
    if (bytes.length >= 12) {
      const riffSignature = bytes.slice(0, 4)
      const webpSignature = bytes.slice(8, 12)
      if (bytesMatch(riffSignature, MAGIC_NUMBERS.WEBP_RIFF) && 
          bytesMatch(webpSignature, MAGIC_NUMBERS.WEBP_WEBP)) {
        return { valid: true }
      }
    }
    
    return {
      valid: false,
      error: 'Invalid image file format',
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to read file',
    }
  }
}

/**
 * Validate MIME type against allowed list
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export async function validateMimeType(
  file: File,
  allowedTypes: string[]
): Promise<FileValidationResult> {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid MIME type. Expected one of: ${allowedTypes.join(', ')}`,
    }
  }
  
  return { valid: true }
}

/**
 * Validate file size against maximum limit
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export async function validateFileSize(
  file: File,
  maxSizeBytes: number
): Promise<FileValidationResult> {
  if (file.size > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(0)
    return {
      valid: false,
      error: `File size exceeds limit (max ${maxSizeMB}MB)`,
    }
  }
  
  return { valid: true }
}
