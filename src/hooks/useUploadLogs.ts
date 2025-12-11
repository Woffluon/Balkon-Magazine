import { useState, useCallback } from 'react'

/**
 * Custom hook for managing upload logs with auto-scroll
 * 
 * Provides log management with automatic timestamping and
 * auto-scroll functionality to keep the latest logs visible.
 * 
 * @returns Log state and control methods
 * 
 * @example
 * ```tsx
 * function UploadDialog() {
 *   const { logs, addLog, reset } = useUploadLogs()
 *   
 *   const startUpload = async () => {
 *     addLog('Starting upload...')
 *     // ... upload logic
 *     addLog('Upload complete!')
 *   }
 *   
 *   return (
 *     <div id="upload-logs">
 *       {logs.map((log, i) => <div key={i}>{log}</div>)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useUploadLogs() {
  const [logs, setLogs] = useState<string[]>([])

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

    setLogs(previousLogs => {
      const updatedLogs = [...previousLogs, logEntry]

      // Auto-scroll to bottom after state update
      queueMicrotask(() => {
        const el = document.getElementById('upload-logs')
        if (el) {
          el.scrollTop = el.scrollHeight
        }
      })

      return updatedLogs
    })
  }, [])

  /**
   * Clears all log entries
   */
  const reset = () => setLogs([])

  /**
   * Returns all logs as a single string (newline-separated)
   * Useful for saving logs to a file
   * 
   * @returns All logs joined with newlines
   */
  const getLogsAsString = (): string => logs.join('\n')

  return { logs, addLog, reset, getLogsAsString }
}
