'use client'

import React, { Component, ReactNode } from 'react'
import { logger } from '@/lib/services/Logger'
import { env } from '@/lib/env'

interface FlipbookViewerErrorBoundaryProps {
  children: ReactNode
  issueNumber?: number
}

interface FlipbookViewerErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * FlipbookViewer Error Boundary
 * 
 * Catches errors in the FlipbookViewer component and provides recovery options.
 * Handles image loading errors gracefully and implements retry functionality.
 * Shows detailed error information in development mode only.
 * 
 * Requirements: 2.4
 * - Creates FlipbookViewerErrorBoundary component
 * - Wraps FlipbookViewer with error boundary
 * - Implements retry functionality
 * - Handles image loading errors gracefully
 */
export class FlipbookViewerErrorBoundary extends Component<
  FlipbookViewerErrorBoundaryProps,
  FlipbookViewerErrorBoundaryState
> {
  constructor(props: FlipbookViewerErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<FlipbookViewerErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to Logger service with FlipbookViewer context
    logger.error('FlipbookViewer error boundary caught error', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      boundary: 'flipbook-viewer',
      componentStack: errorInfo.componentStack,
      issueNumber: this.props.issueNumber,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    })

    this.setState({
      errorInfo,
    })
  }

  handleRetry = (): void => {
    // Reset error state to retry rendering the component
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = (): void => {
    // Force page reload to clear any cached state
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const isDevelopment = env.NODE_ENV === 'development'
      const { error, errorInfo } = this.state
      const { issueNumber } = this.props

      return (
        <div 
          role="alert" 
          aria-live="assertive"
          aria-atomic="true"
          className="w-full rounded-xl border border-red-200 bg-red-50 px-6 py-8 sm:px-8 sm:py-10"
        >
          <div className="flex flex-col items-center text-center gap-6">
            {/* Error Icon */}
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg 
                aria-hidden="true"
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-600"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>

            {/* Error Title */}
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-red-900 mb-2">
                Dergi Görüntüleyici Hatası
              </h3>
              <p className="text-red-800 text-sm sm:text-base mb-2">
                {isDevelopment && error
                  ? error.message
                  : issueNumber
                    ? `${issueNumber}. sayının sayfaları yüklenirken bir hata oluştu.`
                    : 'Dergi sayfaları yüklenirken bir hata oluştu.'}
              </p>
              <p className="text-red-700 text-xs sm:text-sm">
                Lütfen sayfayı yenilemeyi veya tekrar denemeyi deneyin.
              </p>
            </div>

            {/* Development Mode: Show Stack Trace */}
            {isDevelopment && error && (
              <details className="w-full text-left">
                <summary className="cursor-pointer text-sm font-medium text-red-900 hover:text-red-700 mb-2">
                  Teknik Detaylar (Geliştirme Modu)
                </summary>
                <div className="mt-2 space-y-2">
                  <pre className="p-4 bg-red-100 rounded-lg text-xs text-red-900 overflow-x-auto whitespace-pre-wrap break-words">
                    {error.stack}
                  </pre>
                  {errorInfo?.componentStack && (
                    <pre className="p-4 bg-red-100 rounded-lg text-xs text-red-900 overflow-x-auto whitespace-pre-wrap break-words">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Recovery Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Görüntüleyiciyi tekrar dene"
              >
                Tekrar Dene
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-6 py-3 bg-white text-red-600 border border-red-300 rounded-lg font-medium hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-center"
                aria-label="Sayfayı yenile"
              >
                Sayfayı Yenile
              </button>
              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-white text-red-600 border border-red-300 rounded-lg font-medium hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-center"
                aria-label="Dergi listesine dön"
              >
                Dergi Listesine Dön
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
