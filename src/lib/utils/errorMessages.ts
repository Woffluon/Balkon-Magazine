/**
 * Error Message Utilities
 *
 * Implements descriptive Turkish error formatting, field label mapping,
 * and plain serialized Result.error decoding for client components.
 *
 * @module errorMessages
 */

import { ZodError } from 'zod'
import { DatabaseApiError, ErrorType } from '@/lib/errors/DatabaseApiError'
import { AppError } from '@/lib/errors/AppError'
import { getErrorEntry } from '@/lib/constants/errorCatalog'
import { t } from '@/lib/i18n'

/**
 * Formatted error information for display
 */
export interface FormattedError {
  /** User-friendly error message in Turkish */
  message: string
  /** Error type classification */
  type: string
  /** Detailed field-level errors (for validation) */
  fields?: Array<{ field: string; message: string }>
  /** Additional context information */
  context?: Record<string, unknown>
  /** Whether the operation can be retried */
  retryable: boolean
}

const FIELD_LABELS_TR: Record<string, string> = {
  title: 'Başlık',
  new_title: 'Yeni Başlık',
  issue_number: 'Sayı No',
  new_issue: 'Yeni Sayı No',
  old_issue: 'Mevcut Sayı No',
  publication_date: 'Yayın Tarihi',
  email: 'E-posta',
  password: 'Şifre',
  currentPassword: 'Mevcut Şifre',
  newPassword: 'Yeni Şifre',
  pdf_url: 'PDF Adresi',
  cover_image_url: 'Kapak Adresi',
  page_count: 'Sayfa Sayısı',
  version: 'Sürüm',
}

function mapFieldLabelTR(fieldPath: string): string {
  if (!fieldPath) return 'Genel'
  if (FIELD_LABELS_TR[fieldPath]) {
    return FIELD_LABELS_TR[fieldPath]
  }
  const leaf = fieldPath.split('.').pop() ?? fieldPath
  return FIELD_LABELS_TR[leaf] ?? fieldPath
}

interface SerializedErrorLike {
  code: string
  message?: string
  userMessage?: string
  details?: unknown
}

function isSerializedErrorLike(error: unknown): error is SerializedErrorLike {
  if (!error || typeof error !== 'object') {
    return false
  }
  const candidate = error as Record<string, unknown>
  return (
    typeof candidate.code === 'string' &&
    candidate.code.length > 0 &&
    (typeof candidate.userMessage === 'string' || typeof candidate.message === 'string')
  )
}

function classifyErrorCode(code: string): string {
  const upper = code.toUpperCase()
  if (
    upper === 'DB_VERSION_CONFLICT' ||
    upper === 'DATABASE_VERSION_CONFLICT' ||
    upper === 'CONFLICT' ||
    upper.includes('CONFLICT')
  ) {
    return 'CONFLICT'
  }
  if (upper.startsWith('VALIDATION') || upper === 'DATABASE_DUPLICATE_ENTRY') {
    return 'VALIDATION'
  }
  if (
    upper.startsWith('NETWORK') ||
    upper === 'DATABASE_CONNECTION_FAILED' ||
    upper === 'DATABASE_QUERY_TIMEOUT'
  ) {
    return 'NETWORK'
  }
  if (upper.startsWith('AUTH')) {
    return 'PERMISSION'
  }
  return code
}

function extractZodFieldsFromDetails(
  details: unknown
): Array<{ field: string; message: string }> | undefined {
  if (!details || typeof details !== 'object') {
    return undefined
  }
  const zodError = (details as Record<string, unknown>).zodError
  if (!Array.isArray(zodError)) {
    return undefined
  }
  const fields: Array<{ field: string; message: string }> = []
  for (const item of zodError) {
    if (item && typeof item === 'object') {
      const issue = item as { path?: unknown[]; message?: unknown }
      if (typeof issue.message === 'string') {
        const rawPath = Array.isArray(issue.path) ? issue.path.map(String).join('.') : ''
        fields.push({
          field: mapFieldLabelTR(rawPath),
          message: issue.message,
        })
      }
    }
  }
  return fields.length > 0 ? fields : undefined
}

/**
 * Gets a user-friendly error message from any error type
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof DatabaseApiError) {
    return error.getUserMessage()
  }

  if (error instanceof AppError) {
    return error.userMessage
  }

  if (error instanceof ZodError) {
    const fieldErrors = error.issues.map((zodIssue) => {
      const fieldPath = mapFieldLabelTR(zodIssue.path.map(String).join('.'))
      return `${fieldPath}: ${zodIssue.message}`
    })

    if (fieldErrors.length === 1) {
      return `Doğrulama hatası: ${fieldErrors[0]}`
    }

    return `Doğrulama hataları:\n${fieldErrors.join('\n')}`
  }

  if (isSerializedErrorLike(error)) {
    const catalogEntry = getErrorEntry(error.code)
    return error.userMessage?.trim() || catalogEntry.userMessage || t('errors.unknown')
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('network') || message.includes('fetch')) {
      return t('errors.network')
    }

    if (message.includes('timeout')) {
      return 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.'
    }

    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return t('errors.unauthorized')
    }

    if (message.includes('not found')) {
      return 'İstenen kayıt bulunamadı.'
    }

    return error.message
  }

  return t('errors.unknown')
}

/**
 * Formats validation errors with Turkish field names and constraints
 */
export function formatValidationErrors(
  error: ZodError
): Array<{ field: string; message: string }> {
  return error.issues.map((zodIssue) => ({
    field: mapFieldLabelTR(zodIssue.path.map(String).join('.')),
    message: zodIssue.message,
  }))
}

/**
 * Formats an error with full context for display or logging,
 * including plain serialized `{ code, message, userMessage, details? }` objects from Server Actions.
 */
export function formatErrorWithContext(error: unknown): FormattedError {
  if (error instanceof DatabaseApiError) {
    return {
      message: error.getUserMessage(),
      type: error.type,
      context: error.details,
      retryable: error.isRetryable(),
    }
  }

  if (error instanceof AppError) {
    return {
      message: error.userMessage,
      type: classifyErrorCode(error.code),
      context: error.details as Record<string, unknown>,
      retryable: error.isRetryable,
    }
  }

  if (error instanceof ZodError) {
    return {
      message: 'Girilen bilgiler geçersiz. Lütfen kontrol edip tekrar deneyin.',
      type: 'VALIDATION',
      fields: formatValidationErrors(error),
      retryable: false,
    }
  }

  if (isSerializedErrorLike(error)) {
    const type = classifyErrorCode(error.code)
    const catalogEntry = getErrorEntry(error.code)
    const baseContext =
      error.details && typeof error.details === 'object'
        ? { ...(error.details as Record<string, unknown>) }
        : {}

    if (error.code === 'OPERATION_DELETE_PARTIAL_FAILURE') {
      baseContext.cleanup = true
    }

    const fields = extractZodFieldsFromDetails(error.details)
    const retryable =
      type === 'NETWORK' ||
      (type !== 'CONFLICT' && type !== 'VALIDATION' && catalogEntry.isRetryable)

    return {
      message: error.userMessage?.trim() || catalogEntry.userMessage || t('errors.unknown'),
      type,
      fields,
      context: Object.keys(baseContext).length > 0 ? baseContext : undefined,
      retryable,
    }
  }

  if (error instanceof Error) {
    return {
      message: getUserFriendlyError(error),
      type: 'ERROR',
      context: {
        originalMessage: error.message,
        stack: error.stack,
      },
      retryable: false,
    }
  }

  return {
    message: t('errors.unknown'),
    type: 'UNKNOWN',
    context: { error },
    retryable: false,
  }
}

/**
 * Gets error type classification from any error
 */
export function getErrorType(error: unknown): string {
  if (error instanceof DatabaseApiError) {
    return error.type
  }

  if (error instanceof AppError) {
    return error.code
  }

  if (error instanceof ZodError) {
    return ErrorType.VALIDATION
  }

  if (isSerializedErrorLike(error)) {
    return classifyErrorCode(error.code)
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('network') || message.includes('timeout')) {
      return ErrorType.NETWORK
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return ErrorType.PERMISSION
    }

    if (message.includes('not found')) {
      return ErrorType.NOT_FOUND
    }

    if (message.includes('conflict') || message.includes('duplicate')) {
      return ErrorType.CONFLICT
    }
  }

  return ErrorType.UNKNOWN
}

/**
 * Checks if an error is retryable
 */
export function isErrorRetryable(error: unknown): boolean {
  if (error instanceof DatabaseApiError) {
    return error.isRetryable()
  }

  if (error instanceof AppError) {
    return error.isRetryable
  }

  if (isSerializedErrorLike(error)) {
    return getErrorEntry(error.code).isRetryable
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('503') ||
      message.includes('429') ||
      message.includes('econnreset') ||
      message.includes('enotfound')
    )
  }

  return false
}

/**
 * Creates an error message for rollback failures
 */
export function formatRollbackError(
  primaryError: unknown,
  rollbackErrors: unknown[]
): string {
  const primaryMessage = getUserFriendlyError(primaryError)

  if (rollbackErrors.length === 0) {
    return primaryMessage
  }

  const rollbackMessages = rollbackErrors
    .map((rollbackError) => getUserFriendlyError(rollbackError))
    .join('\n- ')

  return `${primaryMessage}\n\nGeri alma işlemi sırasında hatalar oluştu:\n- ${rollbackMessages}\n\nManuel temizlik gerekebilir. Lütfen yönetici ile iletişime geçin.`
}

/**
 * Creates an error message for batch operation failures
 */
export function formatBatchError(
  successCount: number,
  failureCount: number,
  sampleErrors: unknown[]
): string {
  const total = successCount + failureCount

  let message = `Toplu işlem tamamlandı: ${successCount}/${total} başarılı`

  if (failureCount > 0) {
    message += `\n\n${failureCount} işlem başarısız oldu`

    if (sampleErrors.length > 0) {
      const errorMessages = sampleErrors
        .slice(0, 3)
        .map((sampleError) => getUserFriendlyError(sampleError))
        .join('\n- ')

      message += `:\n- ${errorMessages}`

      if (failureCount > 3) {
        message += `\n... ve ${failureCount - 3} hata daha`
      }
    }
  }

  return message
}

/**
 * Creates an error message for version conflicts (optimistic locking)
 */
export function formatVersionConflictError(resourceName: string = 'kayıt'): string {
  return `Bu ${resourceName} siz düzenlerken başka bir işlemle güncellenmiş. Güncel veriyi görmek için sayfayı yenileyin.`
}

/**
 * Creates an error message for duplicate entries
 */
export function formatDuplicateError(fieldName: string, value: string | number): string {
  return `${fieldName} "${value}" zaten mevcut. Lütfen farklı bir değer kullanın.`
}
