import { getAuthenticatedClient } from '@/lib/supabase/server'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'
import { MagazineService } from '@/lib/services/MagazineService'
import { SupabaseStorageService } from '@/lib/services/storage/SupabaseStorageService'
import type { Magazine } from '@/types/magazine'
import { AdminDashboardClient } from './AdminDashboardClient'


export default async function AdminDashboard() {
  // getAuthenticatedClient will redirect to login if not authenticated
  const supabase = await getAuthenticatedClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userEmail = user?.email || ''

  // Use MagazineService instead of direct Supabase calls
  let magazines: Magazine[] = []
  let error: Error | null = null

  try {
    const magazineRepository = new SupabaseMagazineRepository(supabase)
    const storageService = new SupabaseStorageService(supabase)
    const magazineService = new MagazineService(magazineRepository, storageService)
    
    magazines = await magazineService.getAllMagazines()
  } catch (err) {
    error = err instanceof Error ? err : new Error('Unknown error')
    console.error('Error fetching magazines:', error)
  }

  if (error) {
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
                  Dergiler Yüklenemedi
                </h2>
                <p className="text-red-800 text-sm sm:text-base">
                  Dergiler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
                </p>
              </div>

              {/* Recovery Actions */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      window.location.reload();
                    }
                  }}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Sayfayı Yenile
                </button>
                <a
                  href="mailto:dergisezaikarakocanadolulisesi@gmail.com"
                  className="px-6 py-3 bg-white text-red-600 border border-red-300 rounded-lg font-medium hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center gap-2"
                >
                  <svg 
                    aria-hidden="true"
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                  >
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  Destek İle İletişime Geç
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return <AdminDashboardClient magazines={magazines} userEmail={userEmail} />
}

