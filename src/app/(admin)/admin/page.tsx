import { getAuthenticatedClient } from '@/lib/supabase/server'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'
import { AdminDashboardClient } from './AdminDashboardClient'
import { ErrorHandler } from '@/lib/errors/errorHandler'
import { logger } from '@/lib/services/Logger'
import type { Metadata } from 'next'
import type { Result } from '@/lib/errors/errorHandler'
import type { Magazine } from '@/types/magazine'

export const metadata: Metadata = {
  title: 'Admin Paneli - Balkon Dergisi',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminDashboard() {
  // getAuthenticatedClient will redirect to login if not authenticated
  const supabase = await getAuthenticatedClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userEmail = user?.email || ''

  // Use repository to fetch magazines
  const magazineRepository = new SupabaseMagazineRepository(supabase)
  
  // Wrap magazine fetching in try-catch (Requirement 1.2)
  let result: Result<Magazine[]>
  
  try {
    const magazines = await magazineRepository.findAll()
    result = ErrorHandler.success(magazines)
  } catch (error) {
    // Log error with page context
    const appError = ErrorHandler.handleUnknownError(error)
    logger.error('Failed to fetch magazines in admin page', {
      page: 'admin/page',
      operation: 'findAll',
      userId: user?.id,
      userEmail,
      error: {
        code: appError.code,
        message: appError.message,
        stack: appError.stack,
      },
    })
    
    result = ErrorHandler.failure(appError)
  }

  // Display user-friendly error UI if fetch failed
  if (!result.success) {
    return (
      <main className="w-full min-h-screen bg-[#f9f9f9] pt-4">
        <div className="responsive-container py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900">Dergi Yönetimi</h1>
          </div>
          
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
            <div className="mb-2 text-xl font-semibold text-red-900">
              {result.error.userMessage}
            </div>
            <p className="mb-6 max-w-md text-sm text-red-700">
              Dergi listesi yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
            </p>
            <div className="flex gap-3">
              <a
                href="/admin"
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Sayfayı Yenile
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return <AdminDashboardClient magazines={result.data} userEmail={userEmail} />
}

