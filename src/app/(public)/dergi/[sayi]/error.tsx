'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { logger } from '@/lib/services/Logger'
import { env } from '@/lib/config/env'

/**
 * Magazine Detail Error Boundary
 * 
 * Catches all unhandled errors on magazine detail pages.
 * Provides magazine-specific recovery options and logs errors with magazine context.
 * Shows detailed error information in development mode only.
 * 
 * Requirements: 2.3
 * - Displays magazine-specific error boundary with navigation options
 * - Adds "Retry" and "Back to List" actions
 * - Logs errors with magazine context (issue number)
 */
export default function MagazineDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()
  const issueNumber = params?.sayi as string | undefined
  const isDevelopment = env.NODE_ENV === 'development'

  useEffect(() => {
    // Log error to Logger service with magazine context
    logger.error('Magazine detail error boundary caught error', {
      message: error.message,
      name: error.name,
      digest: error.digest,
      stack: error.stack,
      boundary: 'magazine-detail',
      issueNumber,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    })
  }, [error, issueNumber])

  return (
    <main className="w-full min-h-screen bg-[#f9f9f9] pt-4">
      <div className="responsive-container py-6 sm:py-8">
        <div 
          role="alert" 
          aria-live="assertive"
          aria-atomic="true"
          className="max-w-2xl mx-auto rounded-xl border border-red-200 bg-red-50 px-6 py-8 sm:px-8 sm:py-10"
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
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>

            {/* Error Title */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-red-900 mb-2">
                Dergi Yüklenirken Bir Hata Oluştu
              </h2>
              <p className="text-red-800 text-sm sm:text-base mb-2">
                {isDevelopment 
                  ? error.message 
                  : issueNumber 
                    ? `${issueNumber}. sayı yüklenirken bir hata oluştu. Lütfen tekrar deneyin.`
                    : 'Dergi yüklenirken bir hata oluştu. Lütfen tekrar deneyin.'}
              </p>
              {error.digest && (
                <p className="text-red-600 text-xs font-mono">
                  Hata Kodu: {error.digest}
                </p>
              )}
            </div>

            {/* Development Mode: Show Stack Trace */}
            {isDevelopment && error.stack && (
              <details className="w-full text-left">
                <summary className="cursor-pointer text-sm font-medium text-red-900 hover:text-red-700 mb-2">
                  Teknik Detaylar (Geliştirme Modu)
                </summary>
                <pre className="mt-2 p-4 bg-red-100 rounded-lg text-xs text-red-900 overflow-x-auto whitespace-pre-wrap break-words">
                  {error.stack}
                </pre>
              </details>
            )}

            {/* Magazine-Specific Recovery Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => reset()}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Sayfayı yeniden yükle"
              >
                Tekrar Dene
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
      </div>
    </main>
  )
}
