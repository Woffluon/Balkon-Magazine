import { createClient } from '@/lib/supabase/server'
import UploadDialog from './UploadDialog'
import { redirect } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RowActions } from './RowActions'
import MagazineTable from './MagazineTable'


export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/admin/login')
  }

  const { data: magazines, error } = await supabase
    .from('magazines')
    .select('*')
    .order('issue_number', { ascending: false })

  if (error) {
    console.error('Error fetching magazines:', error)
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

  const hasItems = Boolean(magazines && magazines.length > 0)

  return (
    <main className="w-full min-h-screen bg-[#f9f9f9] pt-4">
      <div className="responsive-container py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900">Dergi Yönetimi</h1>
          <UploadDialog />
        </div>

        {!hasItems ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <div className="mb-2 text-xl font-semibold text-gray-900">Henüz dergi bulunmuyor</div>
            <p className="mb-6 max-w-md text-sm text-gray-600">Yeni sayılar ekleyerek yönetim panelinizi zenginleştirin. Kapak ve sayfaları kolayca yükleyin.</p>
            <UploadDialog />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <MagazineTable magazines={magazines as any} />
          </div>
        )}
      </div>
    </main>
  )
}

