import { useState } from 'react'

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
 * Custom hook for managing upload progress tracking
 * 
 * Provides separate progress tracking for cover and page uploads,
 * with methods to update progress and calculate overall completion.
 * 
 * @returns Progress state and control methods
 * 
 * @example
 * ```tsx
 * function UploadDialog() {
 *   const { progress, updateCoverProgress, updatePagesProgress, getOverallProgress } = useUploadProgress()
 *   
 *   const uploadCover = async () => {
 *     updateCoverProgress(50)
 *     // ... upload logic
 *     updateCoverProgress(100, true)
 *   }
 *   
 *   return <div>Overall: {getOverallProgress()}%</div>
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

  /**
   * Updates cover upload progress
   * 
   * @param percent - Progress percentage (0-100)
   * @param done - Whether cover upload is complete
   */
  const updateCoverProgress = (percent: number, done: boolean = false) => {
    setProgress(prev => ({
      ...prev,
      coverProgress: percent,
      coverDone: done
    }))
  }

  /**
   * Updates page upload progress
   * 
   * @param pagesDone - Number of pages uploaded
   * @param totalPages - Total number of pages to upload
   */
  const updatePagesProgress = (pagesDone: number, totalPages: number) => {
    const percent = totalPages > 0 ? (pagesDone / totalPages) * 100 : 0
    setProgress(prev => ({
      ...prev,
      pagesProgress: percent,
      pagesDone,
      totalPages
    }))
  }

  /**
   * Resets all progress tracking to initial state
   */
  const reset = () => {
    setProgress({
      coverProgress: 0,
      coverDone: false,
      pagesProgress: 0,
      pagesDone: 0,
      totalPages: 0
    })
  }

  /**
   * Calculates overall upload progress
   * 
   * Takes into account both cover and page uploads.
   * If pages exist, progress is weighted: 1 unit for cover + N units for pages.
   * 
   * @returns Overall progress percentage (0-100)
   */
  const getOverallProgress = (): number => {
    if (progress.totalPages > 0) {
      const units = progress.totalPages + 1
      const doneUnits = progress.pagesDone + (progress.coverDone ? 1 : 0)
      return Math.round((doneUnits / units) * 100)
    }
    return progress.coverDone ? 100 : 0
  }

  return {
    progress,
    updateCoverProgress,
    updatePagesProgress,
    reset,
    getOverallProgress
  }
}
