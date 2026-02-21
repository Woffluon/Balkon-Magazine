'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BarChart3 } from 'lucide-react'
import MagazineTable from './MagazineTable'
import { UserMenu } from './UserMenu'
import type { Magazine } from '@/types/magazine'

// Lazy load UploadDialog to defer loading pdfjs-dist (~2.5MB) until needed
const UploadDialog = dynamic(() => import('./UploadDialog'), {
  ssr: false,
  loading: () => (
    <Button disabled className="w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4 py-2">
      <span className="hidden sm:inline">Yükleniyor...</span>
      <span className="sm:hidden">...</span>
    </Button>
  )
})

interface AdminDashboardClientProps {
  magazines: Magazine[]
  userEmail: string
}

export function AdminDashboardClient({ magazines, userEmail }: AdminDashboardClientProps) {
  const hasItems = Boolean(magazines && magazines.length > 0)

  return (
    <main className="w-full min-h-screen bg-[#f9f9f9] pt-4">
      <div className="responsive-container py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900">Dergi Yönetimi</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link href="/admin/analytics" passHref>
              <Button variant="outline" className="w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4 py-2 gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">İstatistikler</span>
              </Button>
            </Link>
            <UserMenu userEmail={userEmail} />
            <UploadDialog />
          </div>
        </div>

        {!hasItems ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <div className="mb-2 text-xl font-semibold text-gray-900">Henüz dergi bulunmuyor</div>
            <p className="mb-6 max-w-md text-sm text-gray-600">Yeni sayılar ekleyerek yönetim panelinizi zenginleştirin. Kapak ve sayfaları kolayca yükleyin.</p>
            <UploadDialog />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <MagazineTable magazines={magazines} />
          </div>
        )}
      </div>
    </main>
  )
}
