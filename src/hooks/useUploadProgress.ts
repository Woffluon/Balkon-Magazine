import { useState, useCallback } from 'react'

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

/**
 * Custom hook for managing upload progress tracking and log entries
 * 
 * Provides separate progress tracking for cover and page uploads,
 * with methods to update progress, calculate overall completion,
 * and manage log entries with automatic timestamping.
 * 
 * Satisfies Requirement 2.3: Manages both log entries and progress state
 * 
 * @returns Progress state, log state, and control methods
 * 
 * @example
 * ```tsx
 * function UploadDialog() {
 *   const { 
 *     progress, 
 *     logs,
 *     updateCoverProgress, 
 *     updatePagesProgress, 
 *     addLog,
 *     getOverallProgress,
 *     getLogsAsString
 *   } = useUploadProgress()
 *   
 *   const uploadCover = async () => {
 *     addLog('Starting cover upload...')
 *     updateCoverProgress(50)
 *     // ... upload logic
 *     updateCoverProgress(100, true)
 *     addLog('Cover upload complete!')
 *   }
 *   
 *   return (
 *     <div>
 *       <div>Overall: {getOverallProgress()}%</div>
 *       <div>{logs.map((log, i) => <div key={i}>{log}</div>)}</div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useUploadProgress() {
  const [progress, setProgress] = useState<UploadProgressState>({
    coverProgress: 0,
    coverDone: false,
    pagesProgress: 0,
    pagesDone: 0,
    totalPages: 0
  })

  const [logs, setLogs] = useState<string[]>([])

  /**
   * Updates cover upload progress
   * 
   * @param percent - Progress percentage (0-100)
   * @param done - Whether cover upload is complete
   */
  const updateCoverProgress = useCallback((percent: number, done: boolean = false) => {
    setProgress(prev => ({
      ...prev,
      coverProgress: percent,
      coverDone: done
    }))
  }, [])

  /**
   * Updates page upload progress
   * 
   * @param pagesDone - Number of pages uploaded
   * @param totalPages - Total number of pages to upload
   */
  const updatePagesProgress = useCallback((pagesDone: number, totalPages: number) => {
    const percent = totalPages > 0 ? (pagesDone / totalPages) * 100 : 0
    setProgress(prev => ({
      ...prev,
      pagesProgress: percent,
      pagesDone,
      totalPages
    }))
  }, [])

  /**
   * Adds a new log entry with automatic timestamp
   * 
   * Automatically scrolls the log container to the bottom
   * to keep the latest entry visible.
   * 
   * @param message - The log message to add
   */
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('tr-TR')
    const logEntry = `${timestamp} - ${message}`

    setLogs(prev => {
      const updated = [...prev, logEntry]

      // Auto-scroll to bottom after state update
      queueMicrotask(() => {
        const el = document.getElementById('upload-logs')
        if (el) {
          el.scrollTop = el.scrollHeight
        }
      })

      return updated
    })
  }, [])

  /**
   * Clears all log entries
   */
  const clearLogs = useCallback(() => setLogs([]), [])

  /**
   * Resets all progress tracking and logs to initial state
   */
  const reset = useCallback(() => {
    setProgress({
      coverProgress: 0,
      coverDone: false,
      pagesProgress: 0,
      pagesDone: 0,
      totalPages: 0
    })
    setLogs([])
  }, [])

  /**
   * Calculates overall upload progress
   * 
   * Takes into account both cover and page uploads.
   * If pages exist, progress is weighted: 1 unit for cover + N units for pages.
   * 
   * @returns Overall progress percentage (0-100)
   */
  const getOverallProgress = useCallback((): number => {
    if (progress.totalPages > 0) {
      const units = progress.totalPages + 1
      const doneUnits = progress.pagesDone + (progress.coverDone ? 1 : 0)
      return Math.round((doneUnits / units) * 100)
    }
    return progress.coverDone ? 100 : 0
  }, [progress.totalPages, progress.pagesDone, progress.coverDone])

  /**
   * Returns all logs as a single string (newline-separated)
   * Useful for saving logs to a file
   * 
   * @returns All logs joined with newlines
   */
  const getLogsAsString = useCallback((): string => logs.join('\n'), [logs])

  return {
    progress,
    logs,
    updateCoverProgress,
    updatePagesProgress,
    addLog,
    clearLogs,
    reset,
    getOverallProgress,
    getLogsAsString
  }
}
