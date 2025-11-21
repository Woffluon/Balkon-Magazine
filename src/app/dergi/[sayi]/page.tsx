import dynamic from 'next/dynamic'
import FlipbookViewerSkeleton from '@/components/FlipbookViewerSkeleton'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'
import { MagazineService } from '@/lib/services/MagazineService'
import { SupabaseStorageService } from '@/lib/services/storage/SupabaseStorageService'
import { STORAGE_PATHS } from '@/lib/constants/storage'

const FlipbookViewer = dynamic(() => import('@/components/FlipbookViewer'), {
  loading: () => <FlipbookViewerSkeleton />,
})

export const revalidate = 3600 // Revalidate every hour (ISR)

export default async function DergiPage({ params }: { params: Promise<{ sayi: string }> }) {
  const supabase = await createClient()
  const { sayi: sayiStr } = await params
  const sayi = Number(sayiStr)

  // Use MagazineService to fetch magazine data
  const magazineRepository = new SupabaseMagazineRepository(supabase)
  const storageService = new SupabaseStorageService(supabase)
  const magazineService = new MagazineService(magazineRepository, storageService)

  // Parallel fetch: magazine metadata and file list simultaneously
  const [magazine, filesResult] = await Promise.all([
    magazineService.getMagazineByIssue(sayi),
    (async () => {
      try {
        const pagesPath = STORAGE_PATHS.getPagesPath(sayi)
        return await storageService.list(pagesPath)
      } catch (error) {
        console.error('Error listing page files:', error)
        return []
      }
    })()
  ])

  if (!magazine) return notFound()

  // Process files to generate image URLs
  let imageUrls: string[] = []
  
  if (filesResult.length > 0) {
    // Sort files by page number
    const sorted = [...filesResult].sort((a, b) => {
      const na = parseInt(a.name.replace(/\D/g, ''), 10) || 0
      const nb = parseInt(b.name.replace(/\D/g, ''), 10) || 0
      return na - nb
    })
    
    imageUrls = sorted.map((f) => storageService.getPublicUrl(`${sayi}/pages/${f.name}`))
  } else if (!magazine.pdf_url && magazine.cover_image_url) {
    // Fallback to cover image if no pages found
    imageUrls = [magazine.cover_image_url]
  }

  return (
    <main className="w-full min-h-screen bg-[#f9f9f9]">
      <div className="responsive-container py-8 sm:py-12 lg:py-16">
        {/* Header Section */}
        <div className="mb-8 sm:mb-12">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {magazine.title}
            </h1>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-full border border-red-200">
              <span className="font-medium">{sayi}. Sayı</span>
            </div>
          </div>
        </div>
        
        {/* Magazine Viewer */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
          {imageUrls.length > 0 ? (
            <FlipbookViewer imageUrls={imageUrls} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="text-4xl mb-4">📚</div>
              <div className="text-lg font-medium mb-2">Henüz sayfa yüklenmedi</div>
              <div className="text-sm">Bu sayı için sayfa görselleri henüz hazırlanıyor.</div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ sayi: string }> }) {
  const supabase = await createClient()
  const { sayi: sayiStr } = await params
  const sayi = Number(sayiStr)
  
  // Use MagazineService to fetch magazine data
  const magazineRepository = new SupabaseMagazineRepository(supabase)
  const storageService = new SupabaseStorageService(supabase)
  const magazineService = new MagazineService(magazineRepository, storageService)
  
  const magazine = await magazineService.getMagazineByIssue(sayi)

  if (!magazine) return {}

  return {
    title: `${magazine.title} - Balkon Dergisi`,
    description: `${magazine.title} - Sezai Karakoç Anadolu Lisesi öğrenci dergisi ${sayi}. sayısı`,
  }
}

