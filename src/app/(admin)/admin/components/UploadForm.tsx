'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProgressBar } from './ProgressBar'
import { UPLOAD_LIMITS } from '@/lib/constants/upload'
import {
  FILE_SIZE_LIMITS,
  ALLOWED_MIME_TYPES,
  validatePDF as validatePDFMagic,
  validateImage,
} from '@/lib/services/fileValidation'
import { TURKISH_TITLE_REGEX } from '@/lib/validators/schemas'
import { formatFileSizeTR, formatNumberTR, parseLocalDateTR } from '@/lib/formatters/tr'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Magazine } from '@/types/magazine'

interface UploadFormProps {
  title: string
  issue: number | ''
  date: string
  coverProgress: number
  pagesProgress: number
  overall: number
  busy: boolean
  pagesDone?: number
  totalPages?: number
  existingMagazines?: Magazine[]
  showValidationErrors?: boolean
  hasPdfSelected?: boolean
  onTitleChange: (value: string) => void
  onIssueChange: (value: number | '') => void
  onDateChange: (value: string) => void
  onPdfChange: (file: File | null) => void
  onCoverChange: (file: File | null) => void
}

interface FileValidationState {
  error: string | null
  fileName: string | null
  fileSize: string | null
  isValid: boolean
}

interface FieldValidationState {
  error: string | null
  isValid: boolean
}

export function validateTitleValue(title: string): FieldValidationState {
  const trimmed = title.trim()
  if (!trimmed) {
    return { error: t('validation.titleRequired'), isValid: false }
  }
  if (trimmed.length > 200) {
    return { error: t('validation.titleMax'), isValid: false }
  }
  if (!TURKISH_TITLE_REGEX.test(trimmed)) {
    return { error: t('validation.titleCharset'), isValid: false }
  }
  return { error: null, isValid: true }
}

export function validateIssueNumber(
  issue: number | '',
  existingMagazines: Magazine[]
): FieldValidationState {
  if (issue === '') {
    return { error: t('validation.issueRequired'), isValid: false }
  }

  if (!Number.isInteger(issue) || issue < 1 || issue > 9999) {
    return { error: t('validation.issueRange'), isValid: false }
  }

  const isDuplicate = existingMagazines.some((mag) => mag.issue_number === issue)
  if (isDuplicate) {
    return { error: t('validation.issueDuplicate'), isValid: false }
  }

  return { error: null, isValid: true }
}

export function validateDateValue(date: string): FieldValidationState {
  if (!date.trim()) {
    return { error: t('validation.dateRequired'), isValid: false }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || parseLocalDateTR(date) === null) {
    return { error: t('validation.dateInvalid'), isValid: false }
  }
  return { error: null, isValid: true }
}

async function validatePDF(file: File): Promise<FileValidationState> {
  const isPdfType = ALLOWED_MIME_TYPES.PDF.some((type) => type === file.type)
  if (!isPdfType) {
    return {
      error: t('validation.pdfInvalidType'),
      fileName: null,
      fileSize: null,
      isValid: false,
    }
  }

  if (file.size > UPLOAD_LIMITS.MAX_CLIENT_FILE_SIZE) {
    return {
      error: t('validation.pdfSizeLimit'),
      fileName: null,
      fileSize: null,
      isValid: false,
    }
  }

  const magicValidation = await validatePDFMagic(file)
  if (!magicValidation.valid) {
    return {
      error: magicValidation.error ?? t('validation.pdfInvalidFile'),
      fileName: null,
      fileSize: null,
      isValid: false,
    }
  }

  return {
    error: null,
    fileName: file.name,
    fileSize: formatFileSizeTR(file.size),
    isValid: true,
  }
}

async function validateCover(file: File): Promise<FileValidationState> {
  const isImageType = ALLOWED_MIME_TYPES.IMAGE.some((type) => type === file.type)
  if (!isImageType) {
    return {
      error: t('validation.coverInvalidType'),
      fileName: null,
      fileSize: null,
      isValid: false,
    }
  }

  if (file.size > FILE_SIZE_LIMITS.IMAGE) {
    return {
      error: t('validation.coverSizeLimit'),
      fileName: null,
      fileSize: null,
      isValid: false,
    }
  }

  const magicValidation = await validateImage(file)
  if (!magicValidation.valid) {
    return {
      error: magicValidation.error ?? t('validation.coverInvalidType'),
      fileName: null,
      fileSize: null,
      isValid: false,
    }
  }

  return {
    error: null,
    fileName: file.name,
    fileSize: formatFileSizeTR(file.size),
    isValid: true,
  }
}

export function UploadForm({
  title,
  issue,
  date,
  coverProgress,
  pagesProgress,
  overall,
  busy,
  pagesDone = 0,
  totalPages = 0,
  existingMagazines = [],
  showValidationErrors = false,
  hasPdfSelected = false,
  onTitleChange,
  onIssueChange,
  onDateChange,
  onPdfChange,
  onCoverChange,
}: UploadFormProps) {
  const [pdfValidation, setPdfValidation] = useState<FileValidationState>({
    error: null,
    fileName: null,
    fileSize: null,
    isValid: false,
  })
  const [coverValidation, setCoverValidation] = useState<FileValidationState>({
    error: null,
    fileName: null,
    fileSize: null,
    isValid: false,
  })
  const [touched, setTouched] = useState({
    title: false,
    issue: false,
    date: false,
  })

  const titleState = validateTitleValue(title)
  const issueState = validateIssueNumber(issue, existingMagazines)
  const dateState = validateDateValue(date)

  const showTitleError = (touched.title || showValidationErrors) && titleState.error
  const showIssueError = (issue !== '' || touched.issue || showValidationErrors) && issueState.error
  const showDateError = (touched.date || showValidationErrors) && dateState.error
  const showPdfRequiredError = showValidationErrors && !hasPdfSelected && !pdfValidation.error

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null

    if (!file) {
      setPdfValidation({
        error: null,
        fileName: null,
        fileSize: null,
        isValid: false,
      })
      onPdfChange(null)
      return
    }

    const validation = await validatePDF(file)
    setPdfValidation(validation)

    if (validation.isValid) {
      onPdfChange(file)
    } else {
      onPdfChange(null)
      e.target.value = ''
    }
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null

    if (!file) {
      setCoverValidation({
        error: null,
        fileName: null,
        fileSize: null,
        isValid: false,
      })
      onCoverChange(null)
      return
    }

    const validation = await validateCover(file)
    setCoverValidation(validation)

    if (validation.isValid) {
      onCoverChange(file)
    } else {
      onCoverChange(null)
      e.target.value = ''
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="upload-title" className="text-sm font-medium text-foreground">
          {t('upload.titleLabel')} <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="upload-title"
          value={title}
          placeholder={t('upload.titlePlaceholder')}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
          required
          disabled={busy}
          aria-invalid={showTitleError ? 'true' : 'false'}
          aria-describedby={showTitleError ? 'upload-title-error' : undefined}
          className={cn(showTitleError && 'border-destructive')}
        />
        {showTitleError ? (
          <p id="upload-title-error" role="alert" className="text-xs font-medium text-status-error-fg">
            {titleState.error}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="upload-issue" className="text-sm font-medium text-foreground">
            {t('upload.issueLabel')} <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="upload-issue"
            type="number"
            min={1}
            max={9999}
            step={1}
            value={issue}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') {
                onIssueChange('')
                return
              }
              const parsed = Number(raw)
              if (!Number.isNaN(parsed)) {
                onIssueChange(parsed)
              }
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, issue: true }))}
            required
            disabled={busy}
            aria-invalid={showIssueError ? 'true' : 'false'}
            aria-describedby={
              showIssueError
                ? 'upload-issue-error'
                : issueState.isValid
                  ? 'upload-issue-success'
                  : undefined
            }
            className={cn('tabular-nums', showIssueError && 'border-destructive')}
          />
          {showIssueError ? (
            <p id="upload-issue-error" role="alert" className="text-xs font-medium text-status-error-fg">
              {issueState.error}
            </p>
          ) : issueState.isValid && issue !== '' ? (
            <p id="upload-issue-success" className="text-xs font-medium text-status-success-fg">
              ✓ {t('upload.issueValid')}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="upload-date" className="text-sm font-medium text-foreground">
            {t('upload.dateLabel')} <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="upload-date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, date: true }))}
            required
            disabled={busy}
            aria-invalid={showDateError ? 'true' : 'false'}
            aria-describedby={showDateError ? 'upload-date-error' : undefined}
            className={cn('tabular-nums', showDateError && 'border-destructive')}
          />
          {showDateError ? (
            <p id="upload-date-error" role="alert" className="text-xs font-medium text-status-error-fg">
              {dateState.error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="upload-pdf" className="text-sm font-medium text-foreground">
          {t('upload.pdfLabel')} <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="upload-pdf"
          type="file"
          accept="application/pdf"
          onChange={handlePdfChange}
          required
          disabled={busy}
          aria-invalid={pdfValidation.error || showPdfRequiredError ? 'true' : 'false'}
          aria-describedby={
            pdfValidation.error || showPdfRequiredError
              ? 'upload-pdf-error'
              : pdfValidation.isValid
                ? 'upload-pdf-success'
                : 'upload-pdf-hint'
          }
          className={cn(
            'cursor-pointer',
            (pdfValidation.error || showPdfRequiredError) && 'border-destructive'
          )}
        />
        <p id="upload-pdf-hint" className="text-xs text-muted-foreground">
          {t('upload.pdfHint')}
        </p>
        {pdfValidation.error ? (
          <p id="upload-pdf-error" role="alert" className="text-xs font-medium text-status-error-fg">
            {pdfValidation.error}
          </p>
        ) : showPdfRequiredError ? (
          <p id="upload-pdf-error" role="alert" className="text-xs font-medium text-status-error-fg">
            {t('upload.pdfLabel')}: {t('common.required')}
          </p>
        ) : pdfValidation.isValid && pdfValidation.fileName ? (
          <p id="upload-pdf-success" className="text-xs font-medium text-status-success-fg">
            ✓ {pdfValidation.fileName} ({pdfValidation.fileSize})
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="upload-cover" className="text-sm font-medium text-foreground">
          {t('upload.coverLabel')}{' '}
          <span className="text-xs font-normal text-muted-foreground">({t('common.optional')})</span>
        </Label>
        <Input
          id="upload-cover"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleCoverChange}
          disabled={busy}
          aria-invalid={coverValidation.error ? 'true' : 'false'}
          aria-describedby={
            coverValidation.error
              ? 'upload-cover-error'
              : coverValidation.isValid
                ? 'upload-cover-success'
                : 'upload-cover-hint'
          }
          className={cn('cursor-pointer', coverValidation.error && 'border-destructive')}
        />
        <p id="upload-cover-hint" className="text-xs text-muted-foreground">
          {t('upload.coverHint')}
        </p>
        {coverValidation.error ? (
          <p id="upload-cover-error" role="alert" className="text-xs font-medium text-status-error-fg">
            {coverValidation.error}
          </p>
        ) : coverValidation.isValid && coverValidation.fileName ? (
          <p id="upload-cover-success" className="text-xs font-medium text-status-success-fg">
            ✓ {coverValidation.fileName} ({coverValidation.fileSize})
          </p>
        ) : null}
      </div>

      {busy ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
          <ProgressBar
            value={overall}
            label={t('upload.overallProgress')}
            showPercentage={true}
          />
          <ProgressBar
            value={coverProgress}
            label={t('upload.coverProgress')}
            showPercentage={true}
          />
          <ProgressBar
            value={pagesProgress}
            label={t('upload.pagesProgress', {
              completed: formatNumberTR(pagesDone),
              total: formatNumberTR(totalPages),
            })}
            showPercentage={true}
            fileCount={totalPages > 0 ? { done: pagesDone, total: totalPages } : undefined}
          />
        </div>
      ) : null}
    </div>
  )
}
