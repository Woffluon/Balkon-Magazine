"use client"

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useUploadForm } from '@/hooks/useUploadForm'
import { useUploadProgress } from '@/hooks/useUploadProgress'
import { useUploadLogs } from '@/hooks/useUploadLogs'
import { useStorageService } from '@/hooks/useStorageService'
import { UploadForm } from './components/UploadForm'
import { UploadLogs } from './components/UploadLogs'
import { UploadService } from '@/lib/services/UploadService'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'
import { FileProcessorFactory } from '@/lib/processors/FileProcessorFactory'
import { saveUploadLog } from './actions'
import { useSupabaseClient } from '@/hooks/useSupabaseClient'
import { categorizeError, showError, showSuccess } from '@/lib/utils/uploadErrors'
import type { Magazine } from '@/types/magazine'

export default function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  const [existingMagazines, setExistingMagazines] = useState<Magazine[]>([])
  const router = useRouter()
  
  // Custom hooks for separation of concerns
  const { formState, updateField, reset: resetForm, validate } = useUploadForm()
  const { progress, updateCoverProgress, updatePagesProgress, reset: resetProgress, getOverallProgress } = useUploadProgress()
  const { logs, addLog, reset: resetLogs, getLogsAsString } = useUploadLogs()
  const storageService = useStorageService()
  const supabase = useSupabaseClient()

  /**
   * Consolidated wake lock release function
   * 
   * Handles wake lock cleanup with proper error handling.
   * Uses useCallback to prevent unnecessary effect re-runs.
   * 
   * Dependencies: [wakeLock] - Re-creates when wakeLock changes
   */
  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release()
      } catch (error) {
        console.warn('Wake lock release failed:', error)
      } finally {
        setWakeLock(null)
      }
    }
  }, [wakeLock])

  /**
   * Consolidated localStorage cleanup function
   * 
   * Clears all upload-related localStorage entries.
   * Uses useCallback with empty deps since it has no external dependencies.
   * 
   * Dependencies: [] - Function never changes
   */
  const clearUploadState = useCallback(() => {
    try {
      localStorage.removeItem('uploadState')
      localStorage.removeItem('uploadProgress')
      localStorage.removeItem('uploadLogs')
    } catch (error) {
      console.warn('Failed to clear upload state:', error)
    }
  }, [])

  function reset() {
    resetForm()
    resetProgress()
    resetLogs()
    clearUploadState()
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
   * Cleanup on unmount
   * 
   * Ensures wake lock is released when component unmounts.
   * Dependencies: [releaseWakeLock] - Re-runs when cleanup function changes
   */
  useEffect(() => {
    return () => {
      releaseWakeLock()
    }
  }, [releaseWakeLock])

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
      try {
        if ('wakeLock' in navigator) {
          const lock = await navigator.wakeLock.request('screen')
          setWakeLock(lock)
          addLog('🔒 Ekran kilidi aktif')
        }
      } catch (error) {
        console.warn('Wake lock request failed:', error)
      }
      
      addLog('📤 Yükleme işlemi başlatılıyor...')
      addLog('📄 PDF dosyası hazırlanıyor...')

      issueNumber = typeof formState.issue === 'number' ? formState.issue : 0
      
      // Create and use upload service
      const magazineRepository = new SupabaseMagazineRepository(supabase)
      const uploadService = new UploadService(storageService, magazineRepository, new FileProcessorFactory())

      await uploadService.uploadMagazine({
        pdf: formState.pdf!,
        cover: formState.cover,
        title: formState.title,
        issueNumber,
        publicationDate: formState.date,
        onPdfProcessing: (current, total) => {
          addLog(`🔄 Sayfa ${current}/${total} işleniyor...`)
        },
        onPageProgress: (done, total) => {
          updatePagesProgress(done, total)
          addLog(`✅ Sayfa ${done}/${total} başarıyla yüklendi`)
        },
        onCoverProgress: (percent) => {
          updateCoverProgress(percent, percent === 100)
          if (percent === 100) addLog('🖼️ Kapak görseli yükleme tamamlandı')
        }
      })

      addLog('💾 Veritabanı kaydı oluşturuluyor...')
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
      clearUploadState()
      
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
      clearUploadState()
      
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
   * Dependencies: [busy, clearUploadState] - Re-creates when busy state or cleanup function changes
   */
  const handleDialogClose = useCallback((isOpen: boolean) => {
    if (!isOpen && !busy) {
      // Clear upload state when dialog closes (if not uploading)
      clearUploadState()
    }
    setOpen(isOpen)
  }, [busy, clearUploadState])

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
