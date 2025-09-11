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
    return <p>Dergiler yüklenirken bir hata oluştu.</p>
  }

  return (
    <main className="w-full min-h-screen bg-[#f9f9f9] pt-4">
      <div className="responsive-container py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900">Dergi Yönetimi</h1>
          <UploadDialog />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Sayı No</TableHead>
                <TableHead className="text-xs sm:text-sm">Başlık</TableHead>
                <TableHead className="text-xs sm:text-sm">Yayın Tarihi</TableHead>
                <TableHead className="text-xs sm:text-sm">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {magazines?.map((magazine) => (
                <TableRow key={magazine.id}>
                  <TableCell className="text-xs sm:text-sm">{magazine.issue_number}</TableCell>
                  <TableCell className="text-xs sm:text-sm max-w-[200px] truncate">{magazine.title}</TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    {new Date(magazine.publication_date).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell>
                    <RowActions id={magazine.id} issue={magazine.issue_number} title={magazine.title} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  )
}

