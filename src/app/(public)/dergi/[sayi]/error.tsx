'use client'

/**
 * Error boundary for magazine detail pages
 * Catches and displays errors with retry and navigation options
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
export default function DergiError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="w-full min-h-screen bg-[#f9f9f9]">
      <div className="responsive-container py-8 sm:py-12 lg:py-16">
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
                Dergi Yüklenemedi
              </h2>
              <p className="text-red-800 text-sm sm:text-base mb-2">
                {error.message || 'Dergi yüklenirken bir hata oluştu. Lütfen tekrar deneyin.'}
              </p>
              {error.digest && (
                <p className="text-red-600 text-xs font-mono">
                  Hata Kodu: {error.digest}
                </p>
              )}
            </div>

            {/* Recovery Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => reset()}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Tekrar Dene
              </button>
              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-white text-red-600 border border-red-300 rounded-lg font-medium hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-center"
              >
                Ana Sayfaya Dön
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
