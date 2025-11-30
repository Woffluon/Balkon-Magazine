"use client"

import { useState, useCallback, useEffect } from 'react'
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
import type { Magazine } from '@/types/magazine'
import type { UploadState } from '@/hooks/useUploadPersistence'

export default function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [existingMagazines, setExistingMagazines] = useState<Magazine[]>([])
  const router = useRouter()
  
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
  }

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
          console.error('Failed to fetch magazines:', error)
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
    
    if (!validate()) {
      addLog('Lütfen tüm zorunlu alanları doldurun.')
      return
    }

    let issueNumber = 0
    
    try {
      setBusy(true)
      
      // Request wake lock to prevent screen sleep during upload
      await requestWakeLock()
      if (wakeLockActive) {
        addLog('🔒 Ekran kilidi aktif')
      }
      
      addLog('📤 Yükleme işlemi başlatılıyor...')
      addLog('📄 PDF dosyası hazırlanıyor...')

      issueNumber = typeof formState.issue === 'number' ? formState.issue : 0
      
      // Process PDF using custom hook
      const { pages, totalPages } = await processPDF(formState.pdf!, {
        onProgress: (current, total) => {
          addLog(`🔄 Sayfa ${current}/${total} işleniyor...`)
        }
      })

      addLog(`✅ PDF işleme tamamlandı: ${totalPages} sayfa`)

      // Upload cover if provided
      if (formState.cover) {
        addLog('🖼️ Kapak görseli yükleniyor...')
        const coverPath = `${issueNumber}/cover.webp`
        
        await uploadToStorage(coverPath, formState.cover)
        updateCoverProgress(100, true)
        addLog('🖼️ Kapak görseli yükleme tamamlandı')
      }

      // Upload pages
      addLog(`📄 ${totalPages} sayfa yükleniyor...`)
      for (let i = 0; i < pages.length; i++) {
        const pagePath = `${issueNumber}/pages/page-${String(i + 1).padStart(3, '0')}.webp`
        await uploadToStorage(pagePath, pages[i])
        
        updatePagesProgress(i + 1, totalPages)
        addLog(`✅ Sayfa ${i + 1}/${totalPages} başarıyla yüklendi`)
      }

      // Create database record
      addLog('💾 Veritabanı kaydı oluşturuluyor...')
      const magazineRepository = new SupabaseMagazineRepository(supabase)
      
      await magazineRepository.create({
        title: formState.title,
        issue_number: issueNumber,
        publication_date: formState.date,
        is_published: true,
        cover_image_url: formState.cover ? `${issueNumber}/cover.webp` : undefined,
        page_count: totalPages
      })
      
      addLog('✨ Veritabanı kaydı başarıyla tamamlandı')

      // Save logs
      try {
        await saveUploadLog(String(issueNumber), getLogsAsString() + '\n✅ Tüm işlemler başarıyla tamamlandı')
        addLog('📝 İşlem günlükleri kaydedildi')
      } catch {
        addLog('⚠️ Günlük kaydı başarısız oldu')
      }

      addLog('🎉 Dergi başarıyla yüklendi!')
      
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
      addLog(`HATA: ${errorMessage}`)
      console.error('Upload error:', err)
      
      // Clear upload state on error
      clearState()
      
      // Categorize error and show user-friendly toast
      const categorizedError = categorizeError(err)
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
      
      // Don't close dialog on error so user can see logs
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
            <Button type="submit" disabled={busy} className="w-full sm:w-auto order-1 sm:order-2 bg-neutral-900 hover:bg-neutral-800 text-white">
              {busy ? 'Yükleniyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
