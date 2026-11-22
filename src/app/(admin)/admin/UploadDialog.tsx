'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useUploadForm } from '@/hooks/useUploadForm'
import { useUploadProgress } from '@/hooks/useUploadProgress'
import { useFileUpload } from '@/hooks/useFileUpload'
import { usePDFProcessor } from '@/hooks/usePDFProcessor'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useUploadPersistence } from '@/hooks/useUploadPersistence'
import {
  UploadForm,
  validateDateValue,
  validateIssueNumber,
  validateTitleValue,
} from './components/UploadForm'
import { UploadLogs } from './components/UploadLogs'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'
import { saveUploadLog } from './actions'
import { useSupabaseClient } from '@/hooks/useSupabaseClient'
import { ImageProcessor } from '@/lib/processors/ImageProcessor'
import { categorizeError, showError, showSuccess } from '@/lib/utils/uploadErrors'
import { logger } from '@/lib/services/Logger'
import { IdempotencyManager } from '@/lib/services/IdempotencyManager'
import { APP_CONFIG } from '@/lib/config/app-config'
import { AppError, ProcessingError, StorageError, DatabaseError } from '@/lib/errors/AppError'
import { formatNumberTR } from '@/lib/formatters/tr'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import type { Magazine } from '@/types/magazine'
import type { UploadState } from '@/hooks/useUploadPersistence'

interface ErrorState {
  hasError: boolean
  errorMessage: string
  errorType: 'network' | 'file_size' | 'file_type' | 'server' | 'unknown'
  failedAt?: 'pdf_processing' | 'cover_upload' | 'pages_upload' | 'database'
  lastSuccessfulPage?: number
}

type UploadStage = 'info' | 'process' | 'upload' | 'completed'

export default function UploadDialog() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUploadInProgress, setIsUploadInProgress] = useState(false)
  const [uploadStage, setUploadStage] = useState<UploadStage>('info')
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [existingMagazines, setExistingMagazines] = useState<Magazine[]>([])
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    errorMessage: '',
    errorType: 'unknown',
  })
  const [idempotencyKey, setIdempotencyKey] = useState<string>('')
  const [isUploadCompleted, setIsUploadCompleted] = useState(false)
  const [completedIssueNumber, setCompletedIssueNumber] = useState<number | null>(null)
  const [formResetKey, setFormResetKey] = useState(0)
  const router = useRouter()

  const idempotencyManager = useMemo(() => new IdempotencyManager(), [])

  const { formState, updateField, reset: resetForm, validate } = useUploadForm()
  const {
    progress,
    logs,
    updateCoverProgress,
    updatePagesProgress,
    addLog,
    reset: resetProgress,
    getOverallProgress,
    getLogsAsString,
  } = useUploadProgress()
  const supabase = useSupabaseClient()

  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock(false)
  const { processPDF } = usePDFProcessor()
  const { uploadFile: uploadToStorage } = useFileUpload()
  const { saveState, loadState, clearState } = useUploadPersistence(isUploadInProgress)

  const startIdempotencySession = useCallback(() => {
    const key = idempotencyManager.generateKey()
    setIdempotencyKey(key)

    const wasAlreadyCompleted = idempotencyManager.isCompleted(key)
    setIsUploadCompleted(wasAlreadyCompleted)

    if (wasAlreadyCompleted) {
      addLog('Bu yükleme oturumu daha önce tamamlanmış.')
    }
  }, [idempotencyManager, addLog])

  const reset = useCallback(
    (reopenSession = false) => {
      resetForm()
      resetProgress()
      clearState()
      setFormResetKey((prev) => prev + 1)
      setShowValidationErrors(false)
      setUploadStage('info')
      setCompletedIssueNumber(null)
      setErrorState({
        hasError: false,
        errorMessage: '',
        errorType: 'unknown',
      })

      if (idempotencyKey && isUploadCompleted) {
        idempotencyManager.clear(idempotencyKey)
      }

      if (reopenSession) {
        startIdempotencySession()
      } else {
        setIdempotencyKey('')
        setIsUploadCompleted(false)
      }
    },
    [
      resetForm,
      resetProgress,
      clearState,
      idempotencyKey,
      isUploadCompleted,
      idempotencyManager,
      startIdempotencySession,
    ]
  )

  useEffect(() => {
    if (isDialogOpen) {
      const fetchMagazines = async () => {
        try {
          const magazineRepository = new SupabaseMagazineRepository(supabase)
          const magazines = await magazineRepository.findAll()
          setExistingMagazines(magazines)
        } catch (error) {
          logger.error('Failed to fetch magazines', {
            operation: 'fetch_magazines',
            component: 'UploadDialog',
            error: error instanceof Error ? error.message : String(error),
          })
          setExistingMagazines([])
        }
      }
      fetchMagazines()
    }
  }, [isDialogOpen, supabase])

  useEffect(() => {
    const savedState = loadState()
    if (savedState && savedState.isActive) {
      updateField('issue', savedState.issue)
      updateCoverProgress(savedState.coverProgress)
    }
  }, [loadState, updateField, updateCoverProgress])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isUploadInProgress) {
        const state: UploadState = {
          title: formState.title,
          issue: typeof formState.issue === 'number' ? formState.issue : 0,
          date: formState.date,
          coverProgress: progress.coverProgress,
          pagesProgress: progress.pagesProgress,
          logs: [],
          isActive: isUploadInProgress,
          startTime: Date.now(),
        }
        saveState(state)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isUploadInProgress, formState, progress, saveState])

  function validateUploadForm(): boolean {
    setShowValidationErrors(true)

    if (isUploadCompleted) {
      addLog('Bu yükleme işlemi tamamlandı. Yeni yükleme için pencereyi kapatıp tekrar açın veya Yeni Yükleme düğmesine basın.')
      return false
    }

    if (!idempotencyKey) {
      addLog(t('errors.sessionStartFailed'), 'error')
      return false
    }

    const titleCheck = validateTitleValue(formState.title)
    const issueCheck = validateIssueNumber(formState.issue, existingMagazines)
    const dateCheck = validateDateValue(formState.date)

    if (!validate() || !titleCheck.isValid || !issueCheck.isValid || !dateCheck.isValid) {
      const firstError =
        titleCheck.error ??
        issueCheck.error ??
        dateCheck.error ??
        'Lütfen tüm zorunlu alanları geçerli biçimde doldurun.'
      addLog(firstError, 'error')
      return false
    }

    return true
  }

  async function initializeUploadSession(): Promise<void> {
    setIsUploadInProgress(true)

    if (errorState.hasError) {
      setErrorState({
        hasError: false,
        errorMessage: '',
        errorType: 'unknown',
      })
      addLog('Yeniden deneniyor...')
    }

    try {
      await requestWakeLock()
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        addLog(t('upload.wakeLockActive'), 'info')
      }
    } catch (error) {
      logger.warn('Wake lock request failed, continuing upload', {
        operation: 'wake_lock_request',
        component: 'UploadDialog',
        error: error instanceof Error ? error.message : String(error),
      })
      addLog(t('upload.wakeLockFailed'), 'info')
    }
  }

  async function processPDFFile(
    issueNumber: number
  ): Promise<{ pages: Blob[]; totalPages: number }> {
    setUploadStage('process')

    if (
      errorState.failedAt &&
      errorState.failedAt !== 'pdf_processing' &&
      progress.totalPages > 0
    ) {
      addLog('PDF dosyası yeniden hazırlanıyor...')
      const result = await processPDF(formState.pdf!, {
        onProgress: (current, total) => {
          addLog(`Sayfa ${current}/${total} işleniyor...`, 'progress')
        },
      })
      return { pages: result.pages, totalPages: result.totalPages }
    }

    addLog('Yükleme işlemi başlatılıyor...')
    addLog('PDF dosyası hazırlanıyor...')

    try {
      const result = await processPDF(formState.pdf!, {
        onProgress: (current, total) => {
          addLog(`Sayfa ${current}/${total} işleniyor...`, 'progress')
        },
      })

      addLog(`PDF işleme tamamlandı: ${result.totalPages} sayfa`, 'success')
      return { pages: result.pages, totalPages: result.totalPages }
    } catch (error) {
      throw new ProcessingError(
        `PDF processing failed: ${error instanceof Error ? error.message : String(error)}`,
        'pdf_processing',
        'PDF dosyası işlenirken hata oluştu. Dosyanın geçerli ve okunabilir olduğundan emin olun.',
        false,
        { originalError: error, issueNumber }
      )
    }
  }

  async function uploadCoverImage(issueNumber: number): Promise<void> {
    setUploadStage('upload')

    if (!formState.cover || progress.coverDone) {
      if (progress.coverDone) {
        addLog('Kapak görseli daha önce yüklendi, atlanıyor...', 'info')
      }
      return
    }

    addLog('Kapak görseli yükleniyor...', 'progress')
    const coverPath = `${issueNumber}/${APP_CONFIG.storage.fileNaming.coverFilename}`

    try {
      const processor = new ImageProcessor()
      const result = await processor.process(formState.cover)
      await uploadToStorage(coverPath, result.blob)
      updateCoverProgress(100, true)
      addLog('Kapak görseli yüklendi.', 'success')
    } catch (error) {
      throw new StorageError(
        `Cover upload failed: ${error instanceof Error ? error.message : String(error)}`,
        'upload',
        coverPath,
        'Kapak görseli yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.',
        true,
        { originalError: error, issueNumber }
      )
    }
  }

  async function uploadPages(
    pages: Blob[],
    totalPages: number,
    issueNumber: number
  ): Promise<void> {
    setUploadStage('upload')
    const startPage = errorState.lastSuccessfulPage ?? 0
    const { pagePrefix, pagePadding, extension } = APP_CONFIG.storage.fileNaming

    if (startPage > 0) {
      addLog(`Sayfa ${startPage + 1}/${totalPages} adımından devam ediliyor...`, 'progress')
    } else {
      addLog(`${totalPages} sayfa yükleniyor...`, 'progress')
    }

    for (let i = startPage; i < pages.length; i++) {
      const pageNumber = String(i + 1).padStart(pagePadding, '0')
      const pagePath = `${issueNumber}/pages/${pagePrefix}${pageNumber}${extension}`

      try {
        await uploadToStorage(pagePath, pages[i])
        updatePagesProgress(i + 1, totalPages)
        addLog(`Sayfa ${i + 1}/${totalPages} yüklendi.`, 'success')

        setErrorState((prev) => ({ ...prev, lastSuccessfulPage: i }))
      } catch (error) {
        await saveUploadState(issueNumber)

        throw new StorageError(
          `Page ${i + 1} upload failed: ${error instanceof Error ? error.message : String(error)}`,
          'upload',
          pagePath,
          `Sayfa ${i + 1} yüklenirken hata oluştu. Yükleme kaldığı yerden devam edebilir.`,
          true,
          { originalError: error, pageNumber: i + 1, totalPages, issueNumber }
        )
      }
    }
  }

  async function createMagazineRecord(
    issueNumber: number,
    totalPages: number
  ): Promise<void> {
    addLog('Veritabanı kaydı oluşturuluyor...', 'progress')
    const magazineRepository = new SupabaseMagazineRepository(supabase)

    try {
      await magazineRepository.create({
        title: formState.title.trim(),
        issue_number: issueNumber,
        publication_date: formState.date,
        is_published: true,
        cover_image_url: formState.cover
          ? `${issueNumber}/${APP_CONFIG.storage.fileNaming.coverFilename}`
          : undefined,
        page_count: totalPages,
      })

      addLog('Dergi kaydı veritabanına eklendi.', 'success')
    } catch (error) {
      throw new DatabaseError(
        `Database record creation failed: ${error instanceof Error ? error.message : String(error)}`,
        'insert',
        'magazines',
        'Veritabanı kaydı oluşturulurken hata oluştu. Lütfen tekrar deneyin.',
        true,
        { originalError: error, issueNumber, totalPages }
      )
    }
  }

  async function saveUploadState(issueNumber: number): Promise<void> {
    const state: UploadState = {
      title: formState.title,
      issue: issueNumber,
      date: formState.date,
      coverProgress: progress.coverProgress,
      pagesProgress: progress.pagesProgress,
      logs: [],
      isActive: true,
      startTime: Date.now(),
    }
    saveState(state)
  }

  async function completeUpload(issueNumber: number): Promise<void> {
    const logResult = await saveUploadLog(
      String(issueNumber),
      getLogsAsString() + '\nTüm işlemler başarıyla tamamlandı.'
    )
    if (logResult.success) {
      addLog('İşlem günlüğü kaydedildi.', 'success')
    } else {
      logger.warn('Upload log save failed, continuing', {
        operation: 'save_upload_log',
        component: 'UploadDialog',
        issueNumber,
        error: logResult.error,
      })
      addLog('Günlük dosyası kaydedilemedi (dergi yüklemesi başarılı).', 'info')
    }

    addLog(`Sayı ${issueNumber} yayına hazır.`, 'success')

    idempotencyManager.markCompleted(idempotencyKey)
    setIsUploadCompleted(true)
    setCompletedIssueNumber(issueNumber)
    setUploadStage('completed')
    clearState()

    showSuccess(formState.title.trim(), issueNumber, () => {
      router.push(`/dergi/${issueNumber}`)
    })

    router.refresh()
  }

  async function handleUploadError(
    error: unknown,
    issueNumber: number
  ): Promise<void> {
    let appError: AppError

    if (error instanceof AppError) {
      appError = error
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
      appError = new AppError(
        errorMessage,
        APP_CONFIG.system.errors.defaultCode,
        500,
        APP_CONFIG.system.errors.defaultMessage,
        true,
        { originalError: error }
      )
    }

    addLog(`Hata: ${appError.userMessage}`, 'error')

    let failedAt: ErrorState['failedAt'] = 'pages_upload'
    if (error instanceof ProcessingError) {
      failedAt = 'pdf_processing'
    } else if (error instanceof StorageError && appError.message.includes('cover')) {
      failedAt = 'cover_upload'
    } else if (error instanceof DatabaseError) {
      failedAt = 'database'
    }

    logger.error('Upload error', {
      operation: 'magazine_upload',
      component: 'UploadDialog',
      issueNumber,
      title: formState.title,
      failedAt,
      lastSuccessfulPage: progress.pagesDone > 0 ? progress.pagesDone - 1 : undefined,
      coverDone: progress.coverDone,
      error: appError.message,
      code: appError.code,
      userMessage: appError.userMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })

    const categorizedError = categorizeError(error)

    setErrorState({
      hasError: true,
      errorMessage: appError.userMessage,
      errorType: categorizedError.type,
      failedAt,
      lastSuccessfulPage: progress.pagesDone > 0 ? progress.pagesDone - 1 : undefined,
    })

    await saveUploadState(
      issueNumber || (typeof formState.issue === 'number' ? formState.issue : 0)
    )

    showError(categorizedError)
  }

  async function runUpload(): Promise<void> {
    if (!validateUploadForm()) {
      return
    }

    const issueNumber = typeof formState.issue === 'number' ? formState.issue : 0

    try {
      await initializeUploadSession()
      const { pages, totalPages } = await processPDFFile(issueNumber)
      await uploadCoverImage(issueNumber)
      await uploadPages(pages, totalPages, issueNumber)
      await createMagazineRecord(issueNumber, totalPages)
      await completeUpload(issueNumber)
    } catch (error) {
      await handleUploadError(error, issueNumber)
    } finally {
      setIsUploadInProgress(false)
      await releaseWakeLock()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await runUpload()
  }

  const handleDialogClose = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen && isUploadInProgress) {
        toast.warning(t('upload.closeWhileBusy'))
        return
      }
      if (shouldOpen) {
        if (!idempotencyKey) {
          startIdempotencySession()
        }
      } else if (isUploadCompleted) {
        reset(false)
      } else {
        clearState()
      }
      setIsDialogOpen(shouldOpen)
    },
    [
      isUploadInProgress,
      isUploadCompleted,
      idempotencyKey,
      clearState,
      reset,
      startIdempotencySession,
    ]
  )

  const handleStartNewUpload = () => {
    reset(true)
  }

  const steps: Array<{ key: UploadStage; number: number; label: string }> = [
    { key: 'info', number: 1, label: t('upload.stepInfo') },
    { key: 'process', number: 2, label: t('upload.stepProcess') },
    { key: 'upload', number: 3, label: t('upload.stepUpload') },
  ]

  const stageOrder: Record<UploadStage, number> = {
    info: 1,
    process: 2,
    upload: 3,
    completed: 4,
  }
  const currentOrder = stageOrder[uploadStage]

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="default"
          data-tour="upload-trigger"
          className="w-full sm:w-auto"
        >
          <Plus className="size-4 shrink-0" aria-hidden="true" />
          <span>{t('upload.triggerLabel')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="mx-auto max-h-[88vh] w-[94vw] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground sm:text-xl">
            <span>{t('upload.dialogTitle')}</span>
            {isUploadInProgress ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-info-fg">
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                {t('upload.submitUploading')}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('upload.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* 3-Step Wizard Indicator */}
        <ol
          aria-label={t('upload.stepsLabel')}
          className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/40 p-2"
        >
          {steps.map((step) => {
            const isDone = currentOrder > step.number
            const isCurrent = currentOrder === step.number
            return (
              <li
                key={step.key}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  isDone && 'bg-status-success-bg text-status-success-fg',
                  isCurrent && 'bg-card text-foreground shadow-xs ring-1 ring-border',
                  !isDone && !isCurrent && 'text-muted-foreground'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                    isDone
                      ? 'bg-status-success-fg text-status-success-bg'
                      : isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isDone ? '✓' : step.number}
                </span>
                <span className="truncate">{step.label}</span>
              </li>
            )
          })}
        </ol>

        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <UploadForm
            key={formResetKey}
            title={formState.title}
            issue={formState.issue}
            date={formState.date}
            coverProgress={progress.coverProgress}
            pagesProgress={progress.pagesProgress}
            overall={getOverallProgress()}
            busy={isUploadInProgress}
            pagesDone={progress.pagesDone}
            totalPages={progress.totalPages}
            existingMagazines={existingMagazines}
            showValidationErrors={showValidationErrors}
            hasPdfSelected={formState.pdf !== null}
            onTitleChange={(value) => updateField('title', value)}
            onIssueChange={(value) => updateField('issue', value)}
            onDateChange={(value) => updateField('date', value)}
            onPdfChange={(file) => updateField('pdf', file)}
            onCoverChange={(file) => updateField('cover', file)}
          />

          <UploadLogs
            logs={logs}
            hasError={errorState.hasError}
            busy={isUploadInProgress}
          />

          {/* Persistent Completion Summary */}
          {isUploadCompleted && !isUploadInProgress ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-status-success-border bg-status-success-bg p-4 text-status-success-fg"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="text-sm font-semibold">
                    {t('upload.completedTitle', {
                      issue: completedIssueNumber ?? (typeof formState.issue === 'number' ? formState.issue : ''),
                    })}
                  </h3>
                  <p className="text-sm opacity-90">{t('upload.completedDescription')}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {completedIssueNumber !== null ? (
                      <Button asChild size="sm" variant="default">
                        <Link href={`/dergi/${completedIssueNumber}`}>
                          {t('upload.viewMagazine')}
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleStartNewUpload}
                    >
                      {t('upload.newUpload')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDialogClose(false)}
                    >
                      {t('common.close')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Error Recovery UI */}
          {errorState.hasError && !isUploadInProgress && !isUploadCompleted ? (
            <div
              role="alert"
              className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-status-error-fg"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{t('upload.errorTitle')}</h3>
                  <div className="mt-1.5 space-y-1 text-sm">
                    <p>{errorState.errorMessage}</p>
                    {errorState.lastSuccessfulPage !== undefined ? (
                      <p className="text-xs font-medium tabular-nums">
                        {t('upload.savedPagesProgress', {
                          count: formatNumberTR(errorState.lastSuccessfulPage + 1),
                        })}
                      </p>
                    ) : null}
                    {progress.coverDone ? (
                      <p className="text-xs font-medium">{t('upload.savedCoverProgress')}</p>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="destructive" onClick={runUpload}>
                      {t('upload.submitRetry')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        reset(true)
                        addLog('İşlem iptal edildi ve ilerleme sıfırlandı.')
                      }}
                    >
                      {t('common.reset')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {!isUploadCompleted ? (
            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleDialogClose(false)}
                disabled={isUploadInProgress}
                className="order-2 w-full sm:order-1 sm:w-auto"
              >
                {isUploadInProgress ? t('upload.submitUploading') : t('common.close')}
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={isUploadInProgress}
                aria-busy={isUploadInProgress}
                className="order-1 w-full sm:order-2 sm:w-auto"
              >
                {isUploadInProgress ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    <span>{t('upload.submitUploading')}</span>
                  </>
                ) : errorState.hasError ? (
                  t('upload.submitRetry')
                ) : (
                  t('upload.submitSave')
                )}
              </Button>
            </DialogFooter>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}
