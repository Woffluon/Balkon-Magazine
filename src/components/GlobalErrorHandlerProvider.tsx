'use client'

import { useEffect } from 'react'
import { globalErrorHandler } from '@/lib/errors'

/**
 * Global Error Handler Provider
 * 
 * Client component that initializes the global error handlers
 * for uncaught errors and unhandled promise rejections.
 * 
 * This component should be included in the root layout to ensure
 * error handlers are registered as early as possible.
 */
export function GlobalErrorHandlerProvider() {
  useEffect(() => {
    // Initialize global error handlers
    globalErrorHandler.initialize()

    // Cleanup on unmount
    return () => {
      globalErrorHandler.cleanup()
    }
  }, [])

  // This component doesn't render anything
  return null
}
