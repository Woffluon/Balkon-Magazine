"use client"

import { useState } from 'react'
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

export default function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  
  // Custom hooks for separation of concerns
  const { formState, updateField, reset: resetForm, validate } = useUploadForm()
  const { progress, updateCoverProgress, updatePagesProgress, reset: resetProgress, getOverallProgress } = useUploadProgress()
  const { logs, addLog, reset: resetLogs, getLogsAsString } = useUploadLogs()
  const storageService = useStorageService()
  const supabase = useSupabaseClient()

  function reset() {
    resetForm()
    resetProgress()
    resetLogs()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!validate()) {
      addLog('Lütfen tüm zorunlu alanları doldurun.')
      return
    }

    let issueNumber = 0
    
    try {
      setBusy(true)
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
      
      // Wait a bit to show success message
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      router.refresh()
      setOpen(false)
      reset()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata'
      addLog(`HATA: ${errorMessage}`)
      console.error('Upload error:', err)
      
      // Don't close dialog on error so user can see logs
      alert(`Yükleme başarısız: ${errorMessage}\n\nDetaylar için günlüklere bakın.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="default" className="w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4 py-2">
          <span className="hidden sm:inline">Yeni Dergi Ekle</span>
          <span className="sm:hidden">+ Ekle</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-xl mx-auto max-h-[90vh] overflow-y-auto">
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
              onClick={() => setOpen(false)} 
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
