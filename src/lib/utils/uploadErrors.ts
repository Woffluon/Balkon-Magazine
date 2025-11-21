/**
 * Upload Error Categorization and User-Friendly Messages
 * 
 * This module provides error categorization, user-friendly messages,
 * and toast notification helpers for upload operations.
 */

import { toast } from 'sonner'

/**
 * Upload error categories
 */
export type UploadError =
  | { type: 'network'; message: string }
  | { type: 'file_size'; message: string; maxSize: number }
  | { type: 'file_type'; message: string; expectedTypes: string[] }
  | { type: 'server'; message: string }
  | { type: 'unknown'; message: string }

/**
 * Categorizes an error into one of the defined error types
 * 
 * @param error - The error to categorize
 * @returns Categorized error object
 */
export function categorizeError(error: unknown): UploadError {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const lowerMessage = errorMessage.toLowerCase()

  // Network errors
  if (
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('network error') ||
    lowerMessage.includes('network request failed') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout')
  ) {
    return {
      type: 'network',
      message: errorMessage
    }
  }

  // File size errors
  if (
    lowerMessage.includes('file size') ||
    lowerMessage.includes('too large') ||
    lowerMessage.includes('exceeds') ||
    lowerMessage.includes('maximum size')
  ) {
    // Try to extract max size from error message
    const sizeMatch = errorMessage.match(/(\d+)\s*(mb|gb)/i)
    const maxSize = sizeMatch ? parseInt(sizeMatch[1]) : 100
    
    return {
      type: 'file_size',
      message: errorMessage,
      maxSize
    }
  }

  // File type errors
  if (
    lowerMessage.includes('file type') ||
    lowerMessage.includes('invalid type') ||
    lowerMessage.includes('unsupported format') ||
    lowerMessage.includes('mime type')
  ) {
    return {
      type: 'file_type',
      message: errorMessage,
      expectedTypes: ['PDF', 'JPEG', 'PNG', 'WebP']
    }
  }

  // Server errors (HTML response instead of JSON, 500 errors, etc.)
  if (
    lowerMessage.includes('server') ||
    lowerMessage.includes('internal error') ||
    lowerMessage.includes('500') ||
    lowerMessage.includes('503') ||
    lowerMessage.includes('unexpected token') ||
    lowerMessage.includes('json')
  ) {
    return {
      type: 'server',
      message: errorMessage
    }
  }

  // Unknown errors
  return {
    type: 'unknown',
    message: errorMessage
  }
}

/**
 * User-friendly error messages for each error type
 */
export const errorMessages = {
  network: {
    title: 'Bağlantı Hatası',
    description: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
    action: 'Tekrar Dene'
  },
  file_size: {
    title: 'Dosya Boyutu Hatası',
    description: (maxSize: number) => 
      `Dosya boyutu maksimum ${maxSize}MB olmalıdır. Lütfen daha küçük bir dosya seçin.`,
    action: 'Dosya Seç'
  },
  file_type: {
    title: 'Dosya Türü Hatası',
    description: (types: string[]) => 
      `Sadece ${types.join(', ')} formatları desteklenir. Lütfen geçerli bir dosya seçin.`,
    action: 'Dosya Seç'
  },
  server: {
    title: 'Sunucu Hatası',
    description: 'Sunucu şu anda yanıt veremiyor. Lütfen daha sonra tekrar deneyin.',
    action: 'Tekrar Dene'
  },
  unknown: {
    title: 'Beklenmeyen Hata',
    description: 'Bir hata oluştu. Lütfen tekrar deneyin veya destek ile iletişime geçin.',
    action: 'Tekrar Dene'
  }
} as const

/**
 * Displays an error toast with recovery options
 * 
 * @param error - The categorized error
 * @param onRetry - Optional retry callback
 */
export function showError(error: UploadError, onRetry?: () => void): void {
  let description: string
  let title: string
  let action: string
  
  switch (error.type) {
    case 'network':
      title = errorMessages.network.title
      description = errorMessages.network.description
      action = errorMessages.network.action
      break
    case 'file_size':
      title = errorMessages.file_size.title
      description = errorMessages.file_size.description(error.maxSize)
      action = errorMessages.file_size.action
      break
    case 'file_type':
      title = errorMessages.file_type.title
      description = errorMessages.file_type.description(error.expectedTypes)
      action = errorMessages.file_type.action
      break
    case 'server':
      title = errorMessages.server.title
      description = errorMessages.server.description
      action = errorMessages.server.action
      break
    case 'unknown':
      title = errorMessages.unknown.title
      description = errorMessages.unknown.description
      action = errorMessages.unknown.action
      break
  }

  toast.error(title, {
    description,
    action: onRetry ? {
      label: action,
      onClick: onRetry
    } : undefined,
    duration: 6000 // Longer duration for error messages
  })
}

/**
 * Displays a success toast for completed uploads
 * 
 * @param title - Magazine title
 * @param issueNumber - Issue number
 * @param onView - Optional callback to view the uploaded magazine
 */
export function showSuccess(
  title: string,
  issueNumber: number,
  onView?: () => void
): void {
  toast.success('Dergi Başarıyla Yüklendi', {
    description: `${title} - Sayı ${issueNumber} başarıyla eklendi.`,
    action: onView ? {
      label: 'Görüntüle',
      onClick: onView
    } : undefined,
    duration: 5000
  })
}

/**
 * Displays a loading toast for upload progress
 * 
 * @param message - Loading message
 * @returns Toast ID for updating or dismissing
 */
export function showLoading(message: string): string | number {
  return toast.loading(message, {
    duration: Infinity // Keep showing until dismissed
  })
}

/**
 * Dismisses a toast by ID
 * 
 * @param toastId - The toast ID to dismiss
 */
export function dismissToast(toastId: string | number): void {
  toast.dismiss(toastId)
}
