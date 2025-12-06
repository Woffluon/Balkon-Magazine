import { Input } from '@/components/ui/input'
import { ProgressBar } from './ProgressBar'
import { FILE_SIZE_LIMITS, ALLOWED_MIME_TYPES, validatePDF as validatePDFMagic, validateImage } from '@/lib/services/fileValidation'
import { useState, useEffect } from 'react'
import type { Magazine } from '@/types/magazine'

interface UploadFormProps {
  title: string
  issue: number | ''
  date: string
  coverPct: number
  pagesPct: number
  overall: number
  busy: boolean
  pagesDone?: number
  totalPages?: number
  existingMagazines?: Magazine[]
  onTitleChange: (value: string) => void
  onIssueChange: (value: number) => void
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

interface IssueValidationState {
  error: string | null
  isValid: boolean
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Validate issue number: check range (1-9999) and uniqueness
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
function validateIssueNumber(issue: number | '', existingMagazines: Magazine[]): IssueValidationState {
  // Check if empty
  if (issue === '' || issue === 0) {
    return {
      error: 'Sayı numarası gereklidir',
      isValid: false
    }
  }

  // Check range (1-9999)
  if (issue < 1 || issue > 9999) {
    return {
      error: 'Sayı numarası 1 ile 9999 arasında olmalıdır',
      isValid: false
    }
  }

  // Check for duplicates
  const isDuplicate = existingMagazines.some(mag => mag.issue_number === issue)
  if (isDuplicate) {
    return {
      error: `Sayı ${issue} zaten mevcut`,
      isValid: false
    }
  }

  return {
    error: null,
    isValid: true
  }
}

/**
 * Validate PDF file: check type and size (100MB max)
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
async function validatePDF(file: File): Promise<FileValidationState> {
  // Check MIME type
  const isPdfType = ALLOWED_MIME_TYPES.PDF.some(type => type === file.type)
  if (!isPdfType) {
    return {
      error: 'Sadece PDF dosyaları desteklenir',
      fileName: null,
      fileSize: null,
      isValid: false
    }
  }

  // Check file size (100MB max)
  const maxSize = 100 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      error: `PDF dosyası çok büyük (maksimum 100MB)`,
      fileName: null,
      fileSize: null,
      isValid: false
    }
  }

  // Validate magic number
  const magicValidation = await validatePDFMagic(file)
  if (!magicValidation.valid) {
    return {
      error: 'Geçersiz PDF dosyası',
      fileName: null,
      fileSize: null,
      isValid: false
    }
  }

  return {
    error: null,
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    isValid: true
  }
}

/**
 * Validate cover image: check type and size (10MB max)
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
async function validateCover(file: File): Promise<FileValidationState> {
  // Check MIME type
  const isImageType = ALLOWED_MIME_TYPES.IMAGE.some(type => type === file.type)
  if (!isImageType) {
    return {
      error: 'Sadece JPEG, PNG ve WebP dosyaları desteklenir',
      fileName: null,
      fileSize: null,
      isValid: false
    }
  }

  // Check file size (10MB max)
  if (file.size > FILE_SIZE_LIMITS.IMAGE) {
    const maxSizeMB = (FILE_SIZE_LIMITS.IMAGE / (1024 * 1024)).toFixed(0)
    return {
      error: `Kapak görseli çok büyük (maksimum ${maxSizeMB}MB)`,
      fileName: null,
      fileSize: null,
      isValid: false
    }
  }

  // Validate magic number
  const magicValidation = await validateImage(file)
  if (!magicValidation.valid) {
    return {
      error: 'Geçersiz görsel dosyası',
      fileName: null,
      fileSize: null,
      isValid: false
    }
  }

  return {
    error: null,
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    isValid: true
  }
}

export function UploadForm({
  title,
  issue,
  date,
  coverPct,
  pagesPct,
  busy,
  pagesDone = 0,
  totalPages = 0,
  existingMagazines = [],
  onTitleChange,
  onIssueChange,
  onDateChange,
  onPdfChange,
  onCoverChange
}: UploadFormProps) {
  const [pdfValidation, setPdfValidation] = useState<FileValidationState>({
    error: null,
    fileName: null,
    fileSize: null,
    isValid: false
  })
  const [coverValidation, setCoverValidation] = useState<FileValidationState>({
    error: null,
    fileName: null,
    fileSize: null,
    isValid: false
  })
  const [issueValidation, setIssueValidation] = useState<IssueValidationState>({
    error: null,
    isValid: false
  })

  // Validate issue number whenever it changes
  useEffect(() => {
    if (issue !== '') {
      const validation = validateIssueNumber(issue, existingMagazines)
      setIssueValidation(validation)
    } else {
      setIssueValidation({
        error: null,
        isValid: false
      })
    }
  }, [issue, existingMagazines])

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    
    if (!file) {
      setPdfValidation({
        error: null,
        fileName: null,
        fileSize: null,
        isValid: false
      })
      onPdfChange(null)
      return
    }
    
    // Real-time validation
    const validation = await validatePDF(file)
    setPdfValidation(validation)
    
    if (validation.isValid) {
      onPdfChange(file)
    } else {
      onPdfChange(null)
      e.target.value = '' // Clear the input
    }
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    
    if (!file) {
      setCoverValidation({
        error: null,
        fileName: null,
        fileSize: null,
        isValid: false
      })
      onCoverChange(null)
      return
    }
    
    // Real-time validation
    const validation = await validateCover(file)
    setCoverValidation(validation)
    
    if (validation.isValid) {
      onCoverChange(file)
    } else {
      onCoverChange(null)
      e.target.value = '' // Clear the input
    }
  }

  return (
    <div className="grid gap-3 sm:gap-4">
      <div className="grid gap-2">
        <label className="text-[10px] sm:text-xs font-medium text-gray-700" htmlFor="title">
          Başlık
        </label>
        <Input 
          id="title" 
          value={title} 
          onChange={(e) => onTitleChange(e.target.value)} 
          required 
          disabled={busy}
          className="w-full text-[10px] sm:text-xs"
        />
      </div>
      
      <div className="grid gap-2">
        <label className="text-[10px] sm:text-xs font-medium text-gray-700" htmlFor="issue">
          Sayı No
        </label>
        <Input 
          id="issue" 
          type="number" 
          min="1"
          max="9999"
          value={issue} 
          onChange={(e) => onIssueChange(Number(e.target.value))} 
          required 
          disabled={busy}
          className={`w-full text-[10px] sm:text-xs ${issueValidation.error ? 'border-red-500' : ''}`}
          aria-invalid={issueValidation.error ? "true" : "false"}
          aria-describedby={issueValidation.error ? "issue-error" : issueValidation.isValid ? "issue-success" : undefined}
        />
        {issueValidation.error && (
          <p id="issue-error" role="alert" className="text-[10px] sm:text-xs text-red-600">
            {issueValidation.error}
          </p>
        )}
        {issueValidation.isValid && issue !== '' && (
          <p id="issue-success" className="text-[10px] sm:text-xs text-green-700">
            ✓ Sayı numarası geçerli
          </p>
        )}
      </div>
      
      <div className="grid gap-2">
        <label className="text-[10px] sm:text-xs font-medium text-gray-700" htmlFor="date">
          Yayın Tarihi
        </label>
        <Input 
          id="date" 
          type="date" 
          value={date} 
          onChange={(e) => onDateChange(e.target.value)} 
          required 
          disabled={busy}
          className="w-full text-[10px] sm:text-xs"
        />
      </div>
      
      <div className="grid gap-2">
        <label className="text-[10px] sm:text-xs font-medium text-gray-700" htmlFor="pdf">
          PDF <span className="text-[10px] sm:text-xs text-gray-500">(yalnızca dönüştürmek için; sunucuya yüklenmez)</span>
        </label>
        <Input 
          id="pdf" 
          type="file" 
          accept="application/pdf" 
          onChange={handlePdfChange} 
          required 
          disabled={busy}
          className="w-full text-[10px] sm:text-xs"
          aria-invalid={pdfValidation.error ? "true" : "false"}
          aria-describedby={pdfValidation.error ? "pdf-error" : pdfValidation.isValid ? "pdf-success" : undefined}
        />
        {pdfValidation.error && (
          <p id="pdf-error" role="alert" className="text-[10px] sm:text-xs text-red-600">
            {pdfValidation.error}
          </p>
        )}
        {pdfValidation.isValid && pdfValidation.fileName && (
          <p id="pdf-success" className="text-[10px] sm:text-xs text-green-700">
            ✓ {pdfValidation.fileName} ({pdfValidation.fileSize})
          </p>
        )}
      </div>
      
      <div className="grid gap-2">
        <label className="text-[10px] sm:text-xs font-medium text-gray-700" htmlFor="cover">
          Kapak <span className="text-[10px] sm:text-xs text-gray-500">(opsiyonel)</span>
        </label>
        <Input 
          id="cover" 
          type="file" 
          accept="image/*" 
          onChange={handleCoverChange} 
          disabled={busy}
          className="w-full text-[10px] sm:text-xs"
          aria-invalid={coverValidation.error ? "true" : "false"}
          aria-describedby={coverValidation.error ? "cover-error" : coverValidation.isValid ? "cover-success" : undefined}
        />
        {coverValidation.error && (
          <p id="cover-error" role="alert" className="text-[10px] sm:text-xs text-red-600">
            {coverValidation.error}
          </p>
        )}
        {coverValidation.isValid && coverValidation.fileName && (
          <p id="cover-success" className="text-[10px] sm:text-xs text-green-700">
            ✓ {coverValidation.fileName} ({coverValidation.fileSize})
          </p>
        )}
      </div>
      
      {busy && (
        <>
          <ProgressBar 
            value={coverPct} 
            label="Kapak yükleme ilerlemesi"
            showPercentage={true}
          />
          
          <ProgressBar 
            value={pagesPct} 
            label="Sayfa yükleme ilerlemesi"
            showPercentage={true}
            fileCount={totalPages > 0 ? { done: pagesDone, total: totalPages } : undefined}
          />
        </>
      )}
    </div>
  )
}
