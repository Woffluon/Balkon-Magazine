import { useState, useCallback } from 'react'

/**
 * Upload form state interface
 * Groups all form-related state in a single object
 */
interface UploadFormState {
  title: string
  issue: number | ''
  date: string
  pdf: File | null
  cover: File | null
}

/**
 * Custom hook for managing upload form state
 * 
 * Provides grouped form state management with type-safe field updates,
 * validation, and reset functionality.
 * 
 * @returns Form state and control methods
 * 
 * @example
 * ```tsx
 * function UploadDialog() {
 *   const { formState, updateField, reset, validate } = useUploadForm()
 *   
 *   const handleSubmit = () => {
 *     if (!validate()) {
 *       alert('Please fill all required fields')
 *       return
 *     }
 *     // Process upload...
 *   }
 * }
 * ```
 */
export function useUploadForm() {
  const [formState, setFormState] = useState<UploadFormState>({
    title: '',
    issue: '',
    date: '',
    pdf: null,
    cover: null
  })

  /**
   * Updates a single form field with type safety
   * 
   * @param field - The field name to update
   * @param value - The new value for the field
   */
  const updateField = useCallback(<K extends keyof UploadFormState>(
    field: K,
    value: UploadFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }))
  }, [])

  /**
   * Resets all form fields to initial empty state
   */
  const reset = useCallback(() => {
    setFormState({
      title: '',
      issue: '',
      date: '',
      pdf: null,
      cover: null
    })
  }, [])

  /**
   * Validates that all required fields are filled
   * 
   * @returns true if form is valid, false otherwise
   */
  const validate = useCallback((): boolean => {
    return !!(
      formState.title &&
      formState.issue &&
      formState.date &&
      formState.pdf
    )
  }, [formState.title, formState.issue, formState.date, formState.pdf])

  return { formState, updateField, reset, validate }
}
