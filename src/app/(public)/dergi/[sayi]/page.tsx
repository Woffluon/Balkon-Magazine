import dynamic from 'next/dynamic'
import FlipbookViewerSkeleton from '@/components/FlipbookViewerSkeleton'
import { FlipbookViewerErrorBoundary } from '@/components/FlipbookViewerErrorBoundary'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SupabaseStorageService } from '@/lib/services/storage/SupabaseStorageService'
import { STORAGE_PATHS } from '@/lib/constants/storage'
import { getMagazineByIssue } from '@/lib/magazines'
import { logger } from '@/lib/services/Logger'
import { env } from '@/lib/config/env'
import { validatePageNumber } from '@/lib/validators/urlValidation'
import { sortFilesByNumber } from '@/lib/utils/fileSort'

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
    const result = await getPublishedMagazines()
    
    // Check if result is successful
    if (!result.success) {
      logger.error('Error generating static params', {
        error: result.error,
        operation: 'generate_static_params'
      })
      return []
    }
    
    return result.data.map((magazine) => ({
      sayi: magazine.issue_number.toString(),
    }))
  } catch (error) {
    logger.error('Error generating static params', {
      error,
      operation: 'generate_static_params'
    })
    // Return empty array to allow on-demand generation
    return []
  }
}

export default async function DergiPage({ params }: { params: Promise<{ sayi: string }> }) {
  const supabase = await createClient()
  const { sayi: sayiStr } = await params
  
  // Validate URL parameter
  const sayi = validatePageNumber(sayiStr)
  if (sayi === null) {
    return notFound()
  }

  const storageService = new SupabaseStorageService(supabase)

  // Fetch magazine metadata with error handling
  // Requirements: 1.2 - Wrap database queries in try-catch and return typed error responses
  let magazine: Awaited<ReturnType<typeof getMagazineByIssue>> | null = null
  try {
    magazine = await getMagazineByIssue(sayi)
  } catch (error) {
    const { logger } = await import('@/lib/services/Logger')
    const { ErrorHandler } = await import('@/lib/errors/errorHandler')
    
    const appError = ErrorHandler.handleUnknownError(error)
    logger.error('Failed to fetch magazine by issue', {
      operation: 'getMagazineByIssue',
      issueNumber: sayi,
      error: appError.message,
      code: appError.code,
    })
    
    // Re-throw to trigger error boundary
    throw appError
  }

  if (!magazine) return notFound()

  // Fetch storage files with error handling
  // Requirements: 1.3 - Wrap storage operations in try-catch and handle partial failures
  let filesResult: Awaited<ReturnType<typeof storageService.list>> = []
  try {
    const pagesPath = STORAGE_PATHS.getPagesPath(sayi)
    filesResult = await storageService.list(pagesPath)
  } catch (error) {
    const { logger } = await import('@/lib/services/Logger')
    const { ErrorHandler } = await import('@/lib/errors/errorHandler')
    
    const appError = ErrorHandler.handleStorageError(
      error instanceof Error ? error : new Error(String(error)),
      'list',
      STORAGE_PATHS.getPagesPath(sayi)
    )
    
    logger.warn('Failed to list page files, will fallback to cover image', {
      operation: 'listPageFiles',
      issueNumber: sayi,
      path: STORAGE_PATHS.getPagesPath(sayi),
      error: appError.message,
      code: appError.code,
    })
    
    // Don't throw - this is a partial failure
    // Return empty array to fallback to cover image
    filesResult = []
  }

  // Process files to generate image URLs
  let imageUrls: string[] = []
  
  if (filesResult.length > 0) {
    // Sort files by page number using utility function
    // Requirements: 9.4, 9.5
    const sorted = sortFilesByNumber(filesResult)
    
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
            <FlipbookViewerErrorBoundary issueNumber={sayi}>
              <FlipbookViewer imageUrls={imageUrls} />
            </FlipbookViewerErrorBoundary>
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
  
  // Validate URL parameter
  const sayi = validatePageNumber(sayiStr)
  if (sayi === null) {
    return {}
  }
  
  // Use cached getMagazineByIssue for improved performance (Requirements 8.1-8.5)
  // Requirements: 1.2 - Wrap database queries in try-catch
  let magazine: Awaited<ReturnType<typeof getMagazineByIssue>> | null = null
  try {
    magazine = await getMagazineByIssue(sayi)
  } catch (error) {
    const { logger } = await import('@/lib/services/Logger')
    const { ErrorHandler } = await import('@/lib/errors/errorHandler')
    
    const appError = ErrorHandler.handleUnknownError(error)
    logger.error('Failed to fetch magazine metadata', {
      operation: 'generateMetadata',
      issueNumber: sayi,
      error: appError.message,
      code: appError.code,
    })
    
    // Return empty metadata on error
    return {}
  }

  if (!magazine) return {}

  // Get base URL from environment or fallback to localhost
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
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
