import { logger } from '@/lib/services/Logger'

/**
 * Global Error Handler
 * 
 * Catches unhandled errors and promise rejections at the application level
 * and logs them to the Logger service for monitoring and debugging.
 * 
 * This provides a safety net for errors that escape try-catch blocks
 * and error boundaries.
 */
export class GlobalErrorHandler {
  private isInitialized = false

  /**
   * Initialize global error handlers
   * Should be called once when the application starts
   */
  initialize(): void {
    // Prevent double initialization
    if (this.isInitialized) {
      logger.warn('GlobalErrorHandler already initialized')
      return
    }

    // Only initialize in browser environment
    if (typeof window === 'undefined') {
      return
    }

    // Register error handlers
    window.addEventListener('error', this.handleError)
    window.addEventListener('unhandledrejection', this.handleRejection)

    this.isInitialized = true
    logger.info('GlobalErrorHandler initialized')
  }

  /**
   * Clean up global error handlers
   * Should be called when the application unmounts (e.g., in tests)
   */
  cleanup(): void {
    if (typeof window === 'undefined') {
      return
    }

    window.removeEventListener('error', this.handleError)
    window.removeEventListener('unhandledrejection', this.handleRejection)

    this.isInitialized = false
    logger.info('GlobalErrorHandler cleaned up')
  }

  /**
   * Handle uncaught errors
   */
  private handleError = (event: ErrorEvent): void => {
    const { message, filename, lineno, colno, error } = event

    logger.error('Uncaught error', {
      message,
      filename: this.stripUrlDetails(filename),
      lineno,
      colno,
      stack: error?.stack,
      errorName: error?.name,
      errorMessage: error?.message,
      pathname: window.location.pathname,
      userAgentFamily: this.getUserAgentFamily(navigator.userAgent),
    })

    // Don't prevent default behavior - let the browser handle it too
    // This ensures errors still appear in the console
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleRejection = (event: PromiseRejectionEvent): void => {
    const { reason } = event

    // Extract error information
    const errorInfo = this.extractErrorInfo(reason)

    logger.error('Unhandled promise rejection', {
      ...errorInfo,
      pathname: window.location.pathname,
      userAgentFamily: this.getUserAgentFamily(navigator.userAgent),
    })

    // Don't prevent default behavior - let the browser handle it too
  }

  /**
   * Extract error information from various error types
   */
  private extractErrorInfo(reason: unknown): Record<string, unknown> {
    if (reason instanceof Error) {
      return {
        message: reason.message,
        name: reason.name,
        stack: reason.stack,
      }
    }

    if (typeof reason === 'string') {
      return {
        message: reason,
      }
    }

    if (reason && typeof reason === 'object') {
      return {
        message: JSON.stringify(reason),
        details: reason,
      }
    }

    return {
      message: 'Unknown error',
      reason: String(reason),
    }
  }

  private stripUrlDetails(value: string): string {
    try {
      const url = new URL(value)
      return url.pathname
    } catch {
      return value
    }
  }

  private getUserAgentFamily(userAgent: string): string {
    const normalized = userAgent.toLowerCase()

    if (normalized.includes('iphone') || normalized.includes('android mobile')) {
      return 'mobile'
    }

    if (normalized.includes('ipad') || normalized.includes('tablet') || normalized.includes('android')) {
      return 'tablet'
    }

    return 'desktop'
  }
}

// Export singleton instance
export const globalErrorHandler = new GlobalErrorHandler()
