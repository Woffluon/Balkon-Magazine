import { getAuthenticatedClient } from '@/lib/supabase/server'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'
import { MagazineService } from '@/lib/services/MagazineService'
import { SupabaseStorageService } from '@/lib/services/storage/SupabaseStorageService'
import { AdminDashboardClient } from './AdminDashboardClient'
import type { Metadata } from 'next'

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

  // Use MagazineService instead of direct Supabase calls
  // Throw errors to trigger error boundary (Requirements: 12.4, 12.5)
  const magazineRepository = new SupabaseMagazineRepository(supabase)
  const storageService = new SupabaseStorageService(supabase)
  const magazineService = new MagazineService(magazineRepository, storageService)
  
  const magazines = await magazineService.getAllMagazines()

  return <AdminDashboardClient magazines={magazines} userEmail={userEmail} />
}

