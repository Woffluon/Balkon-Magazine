'use client'

import { useEffect } from 'react'
import { globalErrorHandler } from '@/lib/errors'
import { logger } from '@/lib/services/Logger'

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
    try {
      // Initialize global error handlers with proper logging (Requirement 4.1, 5.1)
      globalErrorHandler.initialize()
      
      logger.info('Global error handlers initialized successfully', {
        component: 'GlobalErrorHandlerProvider',
        operation: 'initialize'
      })
    } catch (error) {
      logger.error('Failed to initialize global error handlers', {
        component: 'GlobalErrorHandlerProvider',
        operation: 'initialize',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Cleanup on unmount with proper error handling
    return () => {
      try {
        globalErrorHandler.cleanup()
        
        logger.debug('Global error handlers cleaned up', {
          component: 'GlobalErrorHandlerProvider',
          operation: 'cleanup'
        })
      } catch (error) {
        logger.error('Failed to cleanup global error handlers', {
          component: 'GlobalErrorHandlerProvider',
          operation: 'cleanup',
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }, [])

  // This component doesn't render anything
  return null
}
