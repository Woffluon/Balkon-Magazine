import { useState, useCallback } from 'react'
import { formatTimeTR } from '@/lib/formatters/tr'

export type UploadLogType = 'info' | 'success' | 'error' | 'progress'

export interface UploadLogEntry {
  id: string
  type: UploadLogType
  message: string
  /** ISO timestamp captured once when the entry is created */
  timestamp: string
}

/**
 * Upload progress state interface
 * Tracks progress for cover and page uploads separately
 */
interface UploadProgressState {
  coverProgress: number
  coverDone: boolean
  pagesProgress: number
  pagesDone: number
  totalPages: number
}

function inferLogType(message: string): UploadLogType {
  const lower = message.toLocaleLowerCase('tr-TR')
  if (lower.includes('hata') || lower.includes('başarısız')) {
    return 'error'
  }
  if (lower.includes('tamamlandı') || lower.includes('başarıyla') || lower.includes('eklendi') || lower.includes('yüklendi')) {
    return 'success'
  }
  if (lower.includes('işleniyor') || lower.includes('başlatılıyor') || lower.includes('hazırlanıyor') || lower.includes('yükleniyor') || lower.includes('oluşturuluyor') || lower.includes('deneniyor') || lower.includes('devam ediliyor')) {
    return 'progress'
  }
  return 'info'
}

function createLogId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Custom hook for managing upload progress tracking and structured log entries.
 */
export function useUploadProgress() {
  const [progress, setProgress] = useState<UploadProgressState>({
    coverProgress: 0,
    coverDone: false,
    pagesProgress: 0,
    pagesDone: 0,
    totalPages: 0,
  })

  const [logs, setLogs] = useState<UploadLogEntry[]>([])

  const updateCoverProgress = useCallback((percent: number, isCompleted: boolean = false) => {
    setProgress((previousProgress) => ({
      ...previousProgress,
      coverProgress: percent,
      coverDone: isCompleted,
    }))
  }, [])

  const updatePagesProgress = useCallback((pagesCompleted: number, totalPageCount: number) => {
    const progressPercent = totalPageCount > 0 ? (pagesCompleted / totalPageCount) * 100 : 0
    setProgress((previousProgress) => ({
      ...previousProgress,
      pagesProgress: progressPercent,
      pagesDone: pagesCompleted,
      totalPages: totalPageCount,
    }))
  }, [])

  /**
   * Adds a new structured log entry with a one-time timestamp.
   */
  const addLog = useCallback((message: string, explicitType?: UploadLogType) => {
    const entry: UploadLogEntry = {
      id: createLogId(),
      type: explicitType ?? inferLogType(message),
      message,
      timestamp: new Date().toISOString(),
    }

    setLogs((previousLogs) => {
      const updatedLogs = [...previousLogs, entry]

      queueMicrotask(() => {
        const el = document.getElementById('upload-logs')
        if (el) {
          el.scrollTop = el.scrollHeight
        }
      })

      return updatedLogs
    })
  }, [])

  const clearLogs = useCallback(() => setLogs([]), [])

  const reset = useCallback(() => {
    setProgress({
      coverProgress: 0,
      coverDone: false,
      pagesProgress: 0,
      pagesDone: 0,
      totalPages: 0,
    })
    setLogs([])
  }, [])

  const getOverallProgress = useCallback((): number => {
    if (progress.totalPages > 0) {
      const units = progress.totalPages + 1
      const doneUnits = progress.pagesDone + (progress.coverDone ? 1 : 0)
      return Math.round((doneUnits / units) * 100)
    }
    return progress.coverDone ? 100 : 0
  }, [progress.totalPages, progress.pagesDone, progress.coverDone])

  const getLogsAsString = useCallback(
    (): string =>
      logs
        .map((entry) => `${formatTimeTR(entry.timestamp, true)} - ${entry.message}`)
        .join('\n'),
    [logs]
  )

  return {
    progress,
    logs,
    updateCoverProgress,
    updatePagesProgress,
    addLog,
    clearLogs,
    reset,
    getOverallProgress,
    getLogsAsString,
  }
}
