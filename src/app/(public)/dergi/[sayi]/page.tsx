import dynamic from 'next/dynamic'
import FlipbookViewerSkeleton from '@/components/FlipbookViewerSkeleton'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SupabaseStorageService } from '@/lib/services/storage/SupabaseStorageService'
import { STORAGE_PATHS } from '@/lib/constants/storage'
import { getMagazineByIssue } from '@/lib/magazines'

const FlipbookViewer = dynamic(() => import('@/components/FlipbookViewer'), {
  loading: () => <FlipbookViewerSkeleton />,
})

export const revalidate = 3600 // Revalidate every hour (ISR)

/**
 * Generate static params for all published magazines at build time
 * Enables static generation with ISR for optimal performance
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export async function generateStaticParams() {
  const { getPublishedMagazines } = await import('@/lib/magazines')
  
  try {
    const magazines = await getPublishedMagazines()
    
    return magazines.map((magazine) => ({
      sayi: magazine.issue_number.toString(),
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    // Return empty array to allow on-demand generation
    return []
  }
}

export default async function DergiPage({ params }: { params: Promise<{ sayi: string }> }) {
  const supabase = await createClient()
  const { sayi: sayiStr } = await params
  const sayi = Number(sayiStr)

  const storageService = new SupabaseStorageService(supabase)

  // Parallel fetch: magazine metadata and file list simultaneously
  // Both queries execute in parallel for improved TTFB (expected ~30% improvement vs sequential)
  // Magazine data errors trigger error boundary (Requirements: 12.4, 12.5)
  // File listing errors are handled gracefully with fallback to cover image
  // Requirements: 6.1, 6.2, 6.3, 6.4
  // Uses cached getMagazineByIssue for improved performance (Requirements 8.1-8.5)
  const [magazine, filesResult] = await Promise.all([
    getMagazineByIssue(sayi), // Throws error to trigger error boundary if magazine fetch fails
    (async () => {
      try {
        const pagesPath = STORAGE_PATHS.getPagesPath(sayi)
        return await storageService.list(pagesPath)
      } catch (error) {
        console.error('Error listing page files:', error)
        // Return empty array - page files are optional, can fallback to cover
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
    imageUrls = [storageService.getPublicUrl(magazine.cover_image_url)]
  }

  // Structured data for SEO (JSON-LD)
  // Requirements: 9.5
  const coverImageUrl = magazine.cover_image_url 
    ? storageService.getPublicUrl(magazine.cover_image_url)
    : null
  
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'PublicationIssue',
    'issueNumber': magazine.issue_number,
    'name': magazine.title,
    'datePublished': magazine.publication_date,
    'image': coverImageUrl,
    'isPartOf': {
      '@type': 'Periodical',
      'name': 'Balkon Dergisi',
      'publisher': {
        '@type': 'EducationalOrganization',
        'name': 'Sezai Karakoç Anadolu Lisesi'
      }
    }
  }

  return (
    <main className="w-full min-h-screen bg-[#f9f9f9]">
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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

/**
 * Generate metadata for magazine detail pages including OG images and Twitter Cards
 * Requirements: 9.2, 9.3, 9.4
 */
export async function generateMetadata({ params }: { params: Promise<{ sayi: string }> }) {
  const { sayi: sayiStr } = await params
  const sayi = Number(sayiStr)
  
  // Use cached getMagazineByIssue for improved performance (Requirements 8.1-8.5)
  const magazine = await getMagazineByIssue(sayi)

  if (!magazine) return {}

  // Get base URL from environment or fallback to localhost
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const canonicalUrl = `${baseUrl}/dergi/${sayi}`
  
  const title = `${magazine.title} - Balkon Dergisi`
  const description = `${magazine.title} - Sezai Karakoç Anadolu Lisesi öğrenci dergisi ${sayi}. sayısı`

  // Generate full storage URL for cover image
  const supabase = await createClient()
  const storageService = new SupabaseStorageService(supabase)
  const coverImageUrl = magazine.cover_image_url 
    ? storageService.getPublicUrl(magazine.cover_image_url)
    : null

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Balkon Dergisi',
      locale: 'tr_TR',
      type: 'article',
      publishedTime: magazine.publication_date,
      images: coverImageUrl ? [
        {
          url: coverImageUrl,
          width: 1200,
          height: 630,
          alt: `${magazine.title} kapak görseli`,
        }
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: coverImageUrl ? [coverImageUrl] : [],
    },
  }
}
