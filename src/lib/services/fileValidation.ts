import { formatFileSizeTR } from '@/lib/formatters/tr'
import { t } from '@/lib/i18n'

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

const MAGIC_NUMBERS = {
  PDF: new Uint8Array([0x25, 0x50, 0x44, 0x46]), // %PDF
  PNG: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), // PNG signature
  JPEG: new Uint8Array([0xff, 0xd8, 0xff]), // JPEG signature
  WEBP_RIFF: new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF
  WEBP_WEBP: new Uint8Array([0x57, 0x45, 0x42, 0x50]), // WEBP (at offset 8)
} as const

export const FILE_SIZE_LIMITS = {
  PDF: 500 * 1024 * 1024, // 500MB
  IMAGE: 10 * 1024 * 1024, // 10MB
} as const

export const ALLOWED_MIME_TYPES = {
  PDF: ['application/pdf'],
  IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
} as const

async function readFileBytes(file: File, numBytes: number): Promise<Uint8Array> {
  const slice = file.slice(0, numBytes)
  const buffer = await slice.arrayBuffer()
  return new Uint8Array(buffer)
}

function bytesMatch(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  return a.every((byte, index) => byte === b[index])
}

/**
 * Validate PDF file by checking magic number
 */
export async function validatePDF(file: File): Promise<FileValidationResult> {
  try {
    const bytes = await readFileBytes(file, 4)

    if (!bytesMatch(bytes, MAGIC_NUMBERS.PDF)) {
      return {
        valid: false,
        error: t('validation.pdfInvalidFile'),
      }
    }

    return { valid: true }
  } catch {
    return {
      valid: false,
      error: 'Seçilen dosya okunamadı. Dosyanın erişilebilir olduğundan emin olup tekrar deneyin.',
    }
  }
}

/**
 * Validate image file by checking magic numbers for PNG, JPEG, or WebP
 */
export async function validateImage(file: File): Promise<FileValidationResult> {
  try {
    const bytes = await readFileBytes(file, 12)

    if (bytes.length >= 4) {
      const pngSignature = bytes.slice(0, 4)
      if (bytesMatch(pngSignature, MAGIC_NUMBERS.PNG)) {
        return { valid: true }
      }
    }

    if (bytes.length >= 3) {
      const jpegSignature = bytes.slice(0, 3)
      if (bytesMatch(jpegSignature, MAGIC_NUMBERS.JPEG)) {
        return { valid: true }
      }
    }

    if (bytes.length >= 12) {
      const riffSignature = bytes.slice(0, 4)
      const webpSignature = bytes.slice(8, 12)
      if (
        bytesMatch(riffSignature, MAGIC_NUMBERS.WEBP_RIFF) &&
        bytesMatch(webpSignature, MAGIC_NUMBERS.WEBP_WEBP)
      ) {
        return { valid: true }
      }
    }

    return {
      valid: false,
      error: t('validation.coverInvalidType'),
    }
  } catch {
    return {
      valid: false,
      error: 'Seçilen görsel okunamadı. Dosyanın erişilebilir olduğundan emin olup tekrar deneyin.',
    }
  }
}

/**
 * Validate MIME type against allowed list
 */
export async function validateMimeType(
  file: File,
  allowedTypes: string[]
): Promise<FileValidationResult> {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Desteklenmeyen dosya türü seçildi. İzin verilen türler: ${allowedTypes.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Validate file size against maximum limit
 */
export async function validateFileSize(
  file: File,
  maxSizeBytes: number
): Promise<FileValidationResult> {
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Dosya boyutu en fazla ${formatFileSizeTR(maxSizeBytes)} olabilir.`,
    }
  }

  return { valid: true }
}
