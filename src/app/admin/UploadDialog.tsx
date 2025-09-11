"use client"

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient as createBrowserSupabase } from '@/lib/supabase/client'
import { addMagazineRecord, saveUploadLog } from './actions'
import { useRouter } from 'next/navigation'

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className="w-full h-2 rounded bg-muted overflow-hidden">
      <div className="h-2 bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

// Background upload state management
interface UploadState {
  title: string
  issue: number
  date: string
  coverPct: number
  coverDone: boolean
  logs: string[]
  pagesPct: number
  pagesDone: number
  totalPages: number
  isActive: boolean
  startTime: number
}

export default function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [issue, setIssue] = useState<number | ''>('')
  const [date, setDate] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)

  const [coverPct, setCoverPct] = useState(0)
  const [coverDone, setCoverDone] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [pagesPct, setPagesPct] = useState(0)
  const [pagesDone, setPagesDone] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  
  const supabase = useMemo(() => createBrowserSupabase(), [])
  const router = useRouter()
  const uploadStateRef = useRef<UploadState | null>(null)
  const visibilityHandlerRef = useRef<(() => void) | null>(null)

  // Save upload state to localStorage
  const saveUploadState = useCallback(() => {
    if (!busy) return
    
    const state: UploadState = {
      title,
      issue: typeof issue === 'number' ? issue : 0,
      date,
      coverPct,
      coverDone,
      logs,
      pagesPct,
      pagesDone,
      totalPages,
      isActive: true,
      startTime: Date.now()
    }
    
    uploadStateRef.current = state
    localStorage.setItem('magazine_upload_state', JSON.stringify(state))
  }, [busy, title, issue, date, coverPct, coverDone, logs, pagesPct, pagesDone, totalPages])

  // Load upload state from localStorage
  const loadUploadState = useCallback((): UploadState | null => {
    try {
      const saved = localStorage.getItem('magazine_upload_state')
      if (saved) {
        return JSON.parse(saved) as UploadState
      }
    } catch (err) {
      console.warn('Upload state yüklenemedi:', err)
    }
    return null
  }, [])

  // Clear upload state from localStorage
  const clearUploadState = useCallback(() => {
    localStorage.removeItem('magazine_upload_state')
    uploadStateRef.current = null
  }, [])

  // Restore state from saved data
  const restoreFromSavedState = useCallback((state: UploadState) => {
    setTitle(state.title)
    setIssue(state.issue)
    setDate(state.date)
    setCoverPct(state.coverPct)
    setCoverDone(state.coverDone)
    setLogs(state.logs)
    setPagesPct(state.pagesPct)
    setPagesDone(state.pagesDone)
    setTotalPages(state.totalPages)
    setBusy(state.isActive)
  }, [])

  // Restore current upload state
  const restoreUploadState = useCallback(() => {
    const state = uploadStateRef.current || loadUploadState()
    if (state && state.isActive) {
      restoreFromSavedState(state)
    }
  }, [loadUploadState, restoreFromSavedState])

  const log = useCallback((msg: string) => {
    const logEntry = `${new Date().toLocaleTimeString('tr-TR')} - ${msg}`
    setLogs((prev) => {
      const out = [...prev, logEntry]
      // auto-scroll
      queueMicrotask(() => {
        const el = document.getElementById('upload-logs')
        if (el) el.scrollTop = el.scrollHeight
      })
      
      return out
    })
  }, [])

  // Enhanced background processing and tab switching support
  useEffect(() => {
    // Handle tab visibility changes (including tab switches)
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      
      if (busy) {
        if (isVisible) {
          restoreUploadState()
        } else {
          saveUploadState()
        }
      }
    }

    visibilityHandlerRef.current = handleVisibilityChange
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [busy, restoreUploadState, saveUploadState])

  // Separate useEffect for wake lock management
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && busy && !wakeLock) {
        try {
          const wl = await navigator.wakeLock.request('screen')
          setWakeLock(wl)
        } catch (err) {
          console.warn('Wake lock başarısız:', err)
        }
      }
    }

    const releaseWakeLock = () => {
      if (wakeLock && !busy) {
        wakeLock.release()
        setWakeLock(null)
      }
    }
    
    if (busy) {
      requestWakeLock()
    } else {
      releaseWakeLock()
    }
  }, [busy, wakeLock])

  // Separate useEffect for initial state restoration
  useEffect(() => {
    const savedState = loadUploadState()
    if (savedState && savedState.isActive) {
      log('Önceki yükleme durumu geri yüklendi')
      restoreFromSavedState(savedState)
    }
  }, [loadUploadState, log, restoreFromSavedState])

  // Save state when progress updates
  useEffect(() => {
    if (busy && logs.length > 0) {
      saveUploadState()
    }
  }, [busy, logs.length, saveUploadState])

  function reset() {
    setTitle('')
    setIssue('')
    setDate('')
    setPdf(null)
    setCover(null)

    setCoverPct(0)
    setLogs([])
    setPagesPct(0)
    setPagesDone(0)
    setTotalPages(0)
    setCoverDone(false)
    
    // Clear background upload state
    clearUploadState()
    
    // Release wake lock
    if (wakeLock) {
      wakeLock.release()
      setWakeLock(null)
    }
  }



  // Enhanced upload with background processing support
  async function uploadFile(path: string, file: File) {
    try {
      const { error } = await supabase.storage
        .from('magazines')
        .upload(path, file, { 
          upsert: true, 
          contentType: file.type, 
          cacheControl: '3600',
          duplex: 'half' // Large file upload optimization
        })
      
      if (error) {
        console.error('Upload error details:', error)
        throw new Error(`Yükleme hatası: ${error.message}`)
      }
    } catch (error) {
      console.error('Upload function error:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Dosya yükleme sırasında bilinmeyen hata')
    }
  }

  async function fileToWebp(file: File, quality = 0.9): Promise<Blob> {
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = reject
        i.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/webp', quality))
      return blob
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !issue || !date || !pdf) {
      log('Lütfen tüm zorunlu alanları doldurun.')
      return
    }
    try {
      setBusy(true)
      log('Yükleme başlatılıyor...')
      
      // Request wake lock to prevent system sleep
      if ('wakeLock' in navigator) {
        try {
          const wl = await navigator.wakeLock.request('screen')
          setWakeLock(wl)
        } catch (err) {
          console.warn('Wake lock başarısız:', err)
        }
      }
      
      const issueStr = String(issue)
      
      // Initialize upload state
      saveUploadState()

      // 1) PDF'ten sayfa görselleri oluştur ve yükle (PDF sunucuya yüklenmez)
      log('PDF sayfaları render edilmeye hazırlanıyor')
      const pdfBuffer = await pdf.arrayBuffer()
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs'
      const pdfDoc = await pdfjs.getDocument({ data: pdfBuffer }).promise
      log(`Toplam sayfa: ${pdfDoc.numPages}`)

      const totalPages = pdfDoc.numPages
      setTotalPages(totalPages)
      const targetHeight = 1200 // daha net görsel için

      // Kapak yoksa ilk sayfadan üretilecek
      let autoCoverBlob: Blob | null = null

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: 1 })
        const scale = targetHeight / viewport.height
        const scaled = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas context alınamadı')
        canvas.width = Math.ceil(scaled.width)
        canvas.height = Math.ceil(scaled.height)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (page as any).render({ canvasContext: ctx as any, viewport: scaled } as any).promise

        const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/webp', 0.9))
        if (i === 1 && !cover) {
          autoCoverBlob = blob
        }

        const fileName = `sayfa_${String(i).padStart(3, '0')}.webp`
        const pagePath = `${issueStr}/pages/${fileName}`
        const fileObj = new File([blob], fileName, { type: 'image/webp' })
        log(`${fileName} yükleme başladı`)
        await uploadFile(pagePath, fileObj)
        const pct = (i / totalPages) * 100
        setPagesPct(pct)
        setPagesDone(i)
        log(`${fileName} yükleme tamamlandı (%${Math.round(pct)})`)
        
        // Always save progress to maintain state consistency
        saveUploadState()
      }

      // 2) Kapak (opsiyonel veya otomatik, webp'ye çevrilir)
      let coverPath: string | null = null
      if (cover) {
        coverPath = `${issueStr}/kapak.webp`
        const coverBlob = await fileToWebp(cover, 0.9)
        const coverFile = new File([coverBlob], 'kapak.webp', { type: 'image/webp' })
        log('Kapak (webp) yükleme başladı')
        await uploadFile(coverPath, coverFile)
        setCoverPct(100)
        setCoverDone(true)
        log('Kapak yükleme tamamlandı (%100)')
        
        // Always save state after cover upload
        saveUploadState()
      } else if (autoCoverBlob) {
        coverPath = `${issueStr}/kapak.webp`
        const autoFile = new File([autoCoverBlob], 'kapak.webp', { type: 'image/webp' })
        log('Otomatik kapak (webp) yükleme başladı')
        await uploadFile(coverPath, autoFile)
        setCoverPct(100)
        setCoverDone(true)
        log('Otomatik kapak yükleme tamamlandı (%100)')
        
        // Always save state after auto cover upload
        saveUploadState()
      }

      // 3) Public URL'leri al
      const coverUrl = coverPath ? supabase.storage.from('magazines').getPublicUrl(coverPath).data.publicUrl : ''
      log('Public URL oluşturuldu')

      // 4) DB kaydı (page_count ile, pdf_url gönderilmez)
      const fd = new FormData()
      fd.append('title', title)
      fd.append('issue_number', issueStr)
      fd.append('publication_date', date)
      fd.append('cover_image_url', coverUrl)
      fd.append('page_count', String(totalPages))
      log('Veritabanına kayıt gönderiliyor')
      
      try {
        await addMagazineRecord(fd)
        log('Veritabanı kaydı tamamlandı')
      } catch (dbError) {
        const errorMessage = dbError instanceof Error ? dbError.message : 'Bilinmeyen veritabanı hatası'
        log(`Veritabanı hatası: ${errorMessage}`)
        throw new Error(`Veritabanı kaydı başarısız: ${errorMessage}`)
      }

      // 5) Logları sunucuya txt olarak kaydet
      try {
        // Mevcut tüm logları al ve son durumu ekle
        const finalLogs = [...logs, 'Veritabanı kaydı tamamlandı', 'Tüm işlemler başarıyla bitirildi']
        const logContent = finalLogs.join('\n')
        await saveUploadLog(issueStr, logContent)
        log('Günlükler sunucuya kaydedildi')
      } catch (logError) {
        const logErrorMessage = logError instanceof Error ? logError.message : 'Bilinmeyen log hatası'
        log('Günlük kaydı başarısız: ' + logErrorMessage)
        // Log kaydı başarısız olursa devam et, kritik değil
      }

      // 6) UI güncelle ve temizle
      router.refresh()
      setOpen(false)
      reset() // This will clear upload state and release wake lock
      log('Tamamlandı - tüm işlemler başarıyla bitirildi')
    } catch (err) {
      console.error('Upload error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata'
      log(`Hata: ${errorMessage}`)
      
      // Clear upload state on error
      clearUploadState()
      
      // HTML hata mesajlarını kontrol et (JSON parse hatası için)
      if (errorMessage.includes('Unexpected token') && errorMessage.includes('<html')) {
        log('Sunucu HTML hatası döndürdü - büyük dosya sorunlu olabilir')
        alert('Yükleme sırasında sunucu hatası oluştu. Lütfen dosya boyutunu kontrol edin ve tekrar deneyin.')
      } else {
        alert(errorMessage)
      }
    } finally {
      setBusy(false)
      
      // Release wake lock
      if (wakeLock) {
        wakeLock.release()
        setWakeLock(null)
      }
    }
  }

  const overall = useMemo(() => {
    if (totalPages > 0) {
      const units = totalPages + 1 // kapak 1 birim
      const doneUnits = pagesDone + (coverDone ? 1 : 0)
      return Math.round((doneUnits / units) * 100)
    }
    return coverDone ? 100 : 0
  }, [pagesDone, totalPages, coverDone])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v) }}>
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
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:gap-4">
          <div className="grid gap-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="title">Başlık</label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
              disabled={busy}
              className="w-full text-sm sm:text-base"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="issue">Sayı No</label>
            <Input 
              id="issue" 
              type="number" 
              value={issue} 
              onChange={(e) => setIssue(Number(e.target.value))} 
              required 
              disabled={busy}
              className="w-full text-sm sm:text-base"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="date">Yayın Tarihi</label>
            <Input 
              id="date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
              disabled={busy}
              className="w-full text-sm sm:text-base"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="pdf">
              PDF <span className="text-xs text-gray-500">(yalnızca dönüştürmek için; sunucuya yüklenmez)</span>
            </label>
            <Input 
              id="pdf" 
              type="file" 
              accept="application/pdf" 
              onChange={(e) => setPdf(e.target.files?.[0] ?? null)} 
              required 
              disabled={busy}
              className="w-full text-xs sm:text-sm"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="cover">
              Kapak <span className="text-xs text-gray-500">(opsiyonel)</span>
            </label>
            <Input 
              id="cover" 
              type="file" 
              accept="image/*" 
              onChange={(e) => setCover(e.target.files?.[0] ?? null)} 
              disabled={busy}
              className="w-full text-xs sm:text-sm"
            />
            <ProgressBar value={coverPct} />
          </div>
          <div className="grid gap-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700">Sayfalar</label>
            <ProgressBar value={pagesPct} />
          </div>
          <div className="text-xs text-gray-600">
            <span>Toplam: %{Math.round(overall)}</span>
          </div>
          <div 
            id="upload-logs" 
            className="rounded-md border border-gray-200 bg-gray-50 p-2 sm:p-3 h-24 sm:h-32 md:h-48 overflow-auto font-mono text-[10px] sm:text-xs leading-relaxed shadow-sm"
          >
            {logs.length ? logs.join('\n') : 'İşlem günlükleri burada görünecek.'}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => !busy && setOpen(false)} 
              disabled={busy}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Kapat
            </Button>
            <Button 
              type="submit" 
              disabled={busy}
              className="w-full sm:w-auto order-1 sm:order-2 bg-neutral-900 hover:bg-neutral-800 text-white"
            >
              {busy ? 'Yükleniyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

