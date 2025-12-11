"use client"

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useUploadForm } from '@/hooks/useUploadForm'
import { useUploadProgress } from '@/hooks/useUploadProgress'
import { useFileUpload } from '@/hooks/useFileUpload'
import { usePDFProcessor } from '@/hooks/usePDFProcessor'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useUploadPersistence } from '@/hooks/useUploadPersistence'
import { UploadForm } from './components/UploadForm'
import { UploadLogs } from './components/UploadLogs'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'
import { saveUploadLog } from './actions'
import { useSupabaseClient } from '@/hooks/useSupabaseClient'
import { categorizeError, showError, showSuccess } from '@/lib/utils/uploadErrors'
import { logger } from '@/lib/services/Logger'
import { IdempotencyManager } from '@/lib/services/IdempotencyManager'
import type { Magazine } from '@/types/magazine'
import type { UploadState } from '@/hooks/useUploadPersistence'

interface ErrorState {
  hasError: boolean
  errorMessage: string
  errorType: 'network' | 'file_size' | 'file_type' | 'server' | 'unknown'
  failedAt?: 'pdf_processing' | 'cover_upload' | 'pages_upload' | 'database'
  lastSuccessfulPage?: number
}

export default function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [existingMagazines, setExistingMagazines] = useState<Magazine[]>([])
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    errorMessage: '',
    errorType: 'unknown'
  })
  const [idempotencyKey, setIdempotencyKey] = useState<string>('')
  const [uploadCompleted, setUploadCompleted] = useState(false)
  const router = useRouter()
  
  // Initialize idempotency manager with useMemo to prevent recreation on every render
  const idempotencyManager = useMemo(() => new IdempotencyManager(), [])
  
  // Custom hooks for separation of concerns
  const { formState, updateField, reset: resetForm, validate } = useUploadForm()
  const { 
    progress, 
    logs,
    updateCoverProgress, 
    updatePagesProgress, 
    addLog,
    reset: resetProgress, 
    getOverallProgress,
    getLogsAsString 
  } = useUploadProgress()
  const supabase = useSupabaseClient()
  
  // New custom hooks
  const { isActive: wakeLockActive, request: requestWakeLock, release: releaseWakeLock } = useWakeLock(false)
  const { processPDF } = usePDFProcessor()
  const { uploadFile: uploadToStorage } = useFileUpload() // Now uses server actions
  const { saveState, loadState, clearState } = useUploadPersistence(busy)

  function reset() {
    resetForm()
    resetProgress()
    clearState()
    setErrorState({
      hasError: false,
      errorMessage: '',
      errorType: 'unknown'
    })
    
    // Clear idempotency key on success to allow new uploads
    if (idempotencyKey && uploadCompleted) {
      idempotencyManager.clear(idempotencyKey)
    }
    
    // Reset idempotency state
    setIdempotencyKey('')
    setUploadCompleted(false)
  }

  /**
   * Generate idempotency key and check for completed uploads when dialog opens
   * 
   * Requirements: 4.3, 4.4
   * - Generates unique idempotency key on mount
   * - Checks if upload with this key was already completed
   * - Disables submit if upload was completed
   */
  useEffect(() => {
    if (open && !idempotencyKey) {
      // Generate new idempotency key
      const key = idempotencyManager.generateKey()
      setIdempotencyKey(key)
      
      // Check if this upload was already completed
      const isCompleted = idempotencyManager.isCompleted(key)
      setUploadCompleted(isCompleted)
      
      if (isCompleted) {
        addLog('⚠️ Bu yükleme işlemi daha önce tamamlanmış.')
      }
    }
  }, [open, idempotencyKey, idempotencyManager, addLog])

  /**
   * Fetch existing magazines when dialog opens
   * 
   * Loads all magazines to check for duplicate issue numbers.
   * Dependencies: [open, supabase] - Re-runs when dialog opens or supabase client changes
   */
  useEffect(() => {
    if (open) {
      const fetchMagazines = async () => {
        try {
          const magazineRepository = new SupabaseMagazineRepository(supabase)
          const magazines = await magazineRepository.findAll()
          setExistingMagazines(magazines)
        } catch (error) {
          logger.error('Failed to fetch magazines', {
            operation: 'fetch_magazines',
            component: 'UploadDialog',
            error: error instanceof Error ? error.message : String(error)
          })
          // Don't block the dialog if fetching fails
          setExistingMagazines([])
        }
      }
      fetchMagazines()
    }
  }, [open, supabase])

  /**
   * Load persisted upload state on mount
   * 
   * Restores upload state if user refreshed during upload.
   * Dependencies: [loadState, updateField, updateCoverProgress] - All are stable functions from custom hooks
   */
  useEffect(() => {
    const savedState = loadState()
    if (savedState && savedState.isActive) {
      updateField('title', savedState.title)
      updateField('issue', savedState.issue)
      updateField('date', savedState.date)
      updateCoverProgress(savedState.coverProgress)
      // Note: We can't restore file objects from localStorage
      // User will need to re-select files
    }
  }, [loadState, updateField, updateCoverProgress])

  /**
   * Auto-save upload state when visibility changes
   * 
   * Saves state when user switches tabs to prevent data loss
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && busy) {
        const state: UploadState = {
          title: formState.title,
          issue: typeof formState.issue === 'number' ? formState.issue : 0,
          date: formState.date,
          coverProgress: progress.coverProgress,
          pagesProgress: progress.pagesProgress,
          logs,
          isActive: busy,
          startTime: Date.now()
        }
        saveState(state)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [busy, formState, progress, logs, saveState])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Check idempotency - prevent duplicate submissions
    if (uploadCompleted) {
      addLog('❌ Bu yükleme işlemi zaten tamamlanmış. Yeni bir yükleme için dialogu kapatıp tekrar açın.')
      return
    }
    
    if (!idempotencyKey) {
      addLog('❌ İdempotency anahtarı oluşturulamadı. Lütfen dialogu kapatıp tekrar açın.')
      return
    }
    
    if (!validate()) {
      addLog('Lütfen tüm zorunlu alanları doldurun.')
      return
    }

    let issueNumber = 0
    let pages: Blob[] = []
    let totalPages = 0
    
    try {
      setBusy(true)
      
      // Clear previous error state when retrying
      if (errorState.hasError) {
        setErrorState({
          hasError: false,
          errorMessage: '',
          errorType: 'unknown'
        })
        addLog('🔄 Yeniden deneniyor...')
      }
      
      issueNumber = typeof formState.issue === 'number' ? formState.issue : 0
      
      // Request wake lock to prevent screen sleep during upload
      // Don't block upload if wake lock fails
      try {
        await requestWakeLock()
        if (wakeLockActive) {
          addLog('🔒 Ekran kilidi aktif')
        }
      } catch (error) {
        logger.warn('Wake lock request failed, continuing upload', {
          operation: 'wake_lock_request',
          component: 'UploadDialog',
          error: error instanceof Error ? error.message : String(error)
        })
        addLog('⚠️ Ekran kilidi başarısız oldu, yükleme devam ediyor')
      }
      
      // Skip PDF processing if we already have pages from previous attempt
      if (errorState.failedAt && errorState.failedAt !== 'pdf_processing' && progress.totalPages > 0) {
        addLog('📄 PDF zaten işlenmiş, devam ediliyor...')
        totalPages = progress.totalPages
        // Note: We can't restore the actual page blobs, but we can skip re-processing
        // In a real retry scenario, we'd need to re-process the PDF
        const result = await processPDF(formState.pdf!, {
          onProgress: (current, total) => {
            addLog(`🔄 Sayfa ${current}/${total} işleniyor...`)
          }
        })
        pages = result.pages
        totalPages = result.totalPages
      } else {
        addLog('📤 Yükleme işlemi başlatılıyor...')
        addLog('📄 PDF dosyası hazırlanıyor...')
        
        // Process PDF using custom hook
        const result = await processPDF(formState.pdf!, {
          onProgress: (current, total) => {
            addLog(`🔄 Sayfa ${current}/${total} işleniyor...`)
          }
        })
        pages = result.pages
        totalPages = result.totalPages

        addLog(`✅ PDF işleme tamamlandı: ${totalPages} sayfa`)
      }

      // Upload cover if provided and not already uploaded
      if (formState.cover && !progress.coverDone) {
        addLog('🖼️ Kapak görseli yükleniyor...')
        const coverPath = `${issueNumber}/cover.webp`
        
        try {
          await uploadToStorage(coverPath, formState.cover)
          updateCoverProgress(100, true)
          addLog('🖼️ Kapak görseli yükleme tamamlandı')
        } catch (err) {
          throw new Error(`Kapak yükleme hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
        }
      } else if (progress.coverDone) {
        addLog('🖼️ Kapak görseli zaten yüklendi, atlanıyor...')
      }

      // Upload pages - resume from last successful page if retrying
      const startPage = errorState.lastSuccessfulPage ?? 0
      if (startPage > 0) {
        addLog(`📄 Sayfa ${startPage + 1}/${totalPages} sayfasından devam ediliyor...`)
      } else {
        addLog(`📄 ${totalPages} sayfa yükleniyor...`)
      }
      
      for (let i = startPage; i < pages.length; i++) {
        const pagePath = `${issueNumber}/pages/page-${String(i + 1).padStart(3, '0')}.webp`
        
        try {
          await uploadToStorage(pagePath, pages[i])
          updatePagesProgress(i + 1, totalPages)
          addLog(`✅ Sayfa ${i + 1}/${totalPages} başarıyla yüklendi`)
          
          // Update last successful page for potential retry
          setErrorState(prev => ({ ...prev, lastSuccessfulPage: i }))
        } catch (err) {
          // Save progress before throwing
          const state: UploadState = {
            title: formState.title,
            issue: issueNumber,
            date: formState.date,
            coverProgress: progress.coverProgress,
            pagesProgress: progress.pagesProgress,
            logs,
            isActive: true,
            startTime: Date.now()
          }
          saveState(state)
          
          throw new Error(`Sayfa ${i + 1} yükleme hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
        }
      }

      // Create database record
      addLog('💾 Veritabanı kaydı oluşturuluyor...')
      const magazineRepository = new SupabaseMagazineRepository(supabase)
      
      try {
        await magazineRepository.create({
          title: formState.title,
          issue_number: issueNumber,
          publication_date: formState.date,
          is_published: true,
          cover_image_url: formState.cover ? `${issueNumber}/cover.webp` : undefined,
          page_count: totalPages
        })
        
        addLog('✨ Veritabanı kaydı başarıyla tamamlandı')
      } catch (err) {
        throw new Error(`Veritabanı hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`)
      }

      // Save logs - don't block main upload if this fails
      const logResult = await saveUploadLog(String(issueNumber), getLogsAsString() + '\n✅ Tüm işlemler başarıyla tamamlandı')
      if (logResult.success) {
        addLog('📝 İşlem günlükleri kaydedildi')
      } else {
        // Log failure but continue - upload was successful
        logger.warn('Upload log save failed, continuing', {
          operation: 'save_upload_log',
          component: 'UploadDialog',
          issueNumber,
          error: logResult.error
        })
        addLog('⚠️ Günlük kaydı başarısız oldu (yükleme başarılı)')
      }

      addLog('🎉 Dergi başarıyla yüklendi!')
      
      // Mark upload as completed (idempotency)
      idempotencyManager.markCompleted(idempotencyKey)
      setUploadCompleted(true)
      
      // Clear upload state on success
      clearState()
      
      // Show success toast
      showSuccess(formState.title, issueNumber, () => {
        router.push(`/dergi/${issueNumber}`)
      })
      
      // Wait a bit to show success message
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      router.refresh()
      setOpen(false)
      reset()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata'
      addLog(`❌ HATA: ${errorMessage}`)
      
      // Determine where the error occurred
      let failedAt: ErrorState['failedAt'] = 'pages_upload'
      if (errorMessage.includes('PDF') || errorMessage.includes('işleme')) {
        failedAt = 'pdf_processing'
      } else if (errorMessage.includes('Kapak')) {
        failedAt = 'cover_upload'
      } else if (errorMessage.includes('Veritabanı')) {
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
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      })
      
      // Categorize error
      const categorizedError = categorizeError(err)
      
      // Set error state WITHOUT clearing progress
      setErrorState({
        hasError: true,
        errorMessage,
        errorType: categorizedError.type,
        failedAt,
        lastSuccessfulPage: progress.pagesDone > 0 ? progress.pagesDone - 1 : undefined
      })
      
      // Save state for potential recovery
      const state: UploadState = {
        title: formState.title,
        issue: issueNumber || (typeof formState.issue === 'number' ? formState.issue : 0),
        date: formState.date,
        coverProgress: progress.coverProgress,
        pagesProgress: progress.pagesProgress,
        logs,
        isActive: false, // Not active anymore due to error
        startTime: Date.now()
      }
      saveState(state)
      
      // Show error toast with retry option
      showError(categorizedError, () => {
        // Retry by resubmitting the form
        const syntheticEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          nativeEvent: new Event('submit'),
          currentTarget: document.createElement('form'),
          target: document.createElement('form'),
          bubbles: false,
          cancelable: false,
          defaultPrevented: false,
          eventPhase: 0,
          isTrusted: false,
          timeStamp: Date.now(),
          type: 'submit',
          isDefaultPrevented: () => false,
          isPropagationStopped: () => false,
          persist: () => {},
        } as React.FormEvent<HTMLFormElement>
        handleSubmit(syntheticEvent)
      })
      
      // Don't close dialog on error so user can see logs and retry
    } finally {
      setBusy(false)
      // Release wake lock
      await releaseWakeLock()
    }
  }

  /**
   * Dialog close handler with cleanup
   * 
   * Clears upload state when dialog closes (unless upload is in progress).
   * Uses useCallback to prevent unnecessary re-renders of Dialog component.
   * 
   * Dependencies: [busy, clearState] - Re-creates when busy state or cleanup function changes
   */
  const handleDialogClose = useCallback((isOpen: boolean) => {
    if (!isOpen && !busy) {
      // Clear upload state when dialog closes (if not uploading)
      clearState()
    }
    setOpen(isOpen)
  }, [busy, clearState])

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button type="button" variant="default" className="w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4 py-2">
          <span className="hidden sm:inline">Yeni Dergi Ekle</span>
          <span className="sm:hidden">+ Ekle</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[92vw] sm:w-[90vw] max-w-xl mx-auto max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl text-gray-900 font-semibold">
            Yeni Dergi Ekle
            {busy && <span className="ml-2 text-sm text-blue-600 font-normal">(Yükleniyor...)</span>}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            PDF dosyanızı yükleyin ve dergi bilgilerini girin
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:gap-4">
          <UploadForm
            title={formState.title}
            issue={formState.issue}
            date={formState.date}
            coverPct={progress.coverProgress}
            pagesPct={progress.pagesProgress}
            overall={getOverallProgress()}
            busy={busy}
            pagesDone={progress.pagesDone}
            totalPages={progress.totalPages}
            existingMagazines={existingMagazines}
            onTitleChange={(value) => updateField('title', value)}
            onIssueChange={(value) => updateField('issue', value)}
            onDateChange={(value) => updateField('date', value)}
            onPdfChange={(file) => updateField('pdf', file)}
            onCoverChange={(file) => updateField('cover', file)}
          />
          <UploadLogs logs={logs} />
          
          {/* Upload Completed UI */}
          {uploadCompleted && !busy && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-green-800">
                    Yükleme Tamamlandı
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Bu yükleme işlemi başarıyla tamamlanmış. Yeni bir yükleme yapmak için dialogu kapatıp tekrar açın.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Recovery UI */}
          {errorState.hasError && !busy && !uploadCompleted && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    Yükleme Hatası
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{errorState.errorMessage}</p>
                    {errorState.lastSuccessfulPage !== undefined && (
                      <p className="mt-1">
                        İlerleme kaydedildi: {errorState.lastSuccessfulPage + 1} sayfa başarıyla yüklendi.
                      </p>
                    )}
                    {progress.coverDone && (
                      <p className="mt-1">
                        Kapak görseli başarıyla yüklendi.
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      🔄 Tekrar Dene
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        reset()
                        addLog('İşlem iptal edildi ve ilerleme sıfırlandı.')
                      }}
                    >
                      Sıfırla
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => handleDialogClose(false)} 
              disabled={busy} 
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {busy ? 'Yükleme devam ediyor...' : 'Kapat'}
            </Button>
            <Button 
              type="submit" 
              disabled={busy || uploadCompleted} 
              className="w-full sm:w-auto order-1 sm:order-2 bg-neutral-900 hover:bg-neutral-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadCompleted ? '✓ Tamamlandı' : busy ? 'Yükleniyor...' : errorState.hasError ? '🔄 Tekrar Dene' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
