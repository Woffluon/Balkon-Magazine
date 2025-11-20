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
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
            Dergiler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
          </div>
        </div>
      </main>
    )
  }

  return <AdminDashboardClient magazines={magazines} userEmail={userEmail} />
}

