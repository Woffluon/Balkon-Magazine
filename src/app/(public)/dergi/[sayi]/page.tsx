import dynamic from 'next/dynamic'
import FlipbookViewerSkeleton from '@/components/FlipbookViewerSkeleton'
import { FlipbookViewerErrorBoundary } from '@/components/FlipbookViewerErrorBoundary'
import { createPublicClient } from '@/lib/supabase/server'
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

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

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
  const supabase = createPublicClient()
  const { sayi: sayiStr } = await params

  // Validate URL parameter
  const sayi = validatePageNumber(sayiStr)
  if (sayi === null) {
    return notFound()
  }

  const storageService = new SupabaseStorageService(supabase)

  // Parallelize independent queries for better performance
  // Requirements: 1.2 - Use Promise.all for independent queries
  const [magazineResult, filesResult] = await Promise.all([
    // Fetch magazine metadata with error handling
    (async () => {
      try {
        const magazine = await getMagazineByIssue(sayi)
        return { success: true as const, data: magazine }
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

        return { success: false as const, error: appError }
      }
    })(),

    // Fetch storage files with error handling
    // Requirements: 1.3 - Wrap storage operations in try-catch and handle partial failures
    (async () => {
      try {
        const pagesPath = STORAGE_PATHS.getPagesPath(sayi)
        const files = await storageService.list(pagesPath)
        return { success: true as const, data: files }
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
        return { success: true as const, data: [] }
      }
    })()
  ])

  // Handle magazine fetch failure
  if (!magazineResult.success) {
    throw magazineResult.error
  }

  const magazine = magazineResult.data
  if (!magazine) return notFound()

  // Extract files from result
  const files = filesResult.success ? filesResult.data : []

  // Process files to generate image URLs
  let imageUrls: string[] = []

  if (files.length > 0) {
    // Sort files by page number using utility function
    // Requirements: 9.4, 9.5
    const sorted = sortFilesByNumber(files)

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

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Anasayfa",
        "item": env.NEXT_PUBLIC_SITE_URL || 'https://balkondergi.com'
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": `Sayı ${sayi}`,
        "item": `${env.NEXT_PUBLIC_SITE_URL || 'https://balkondergi.com'}/dergi/${sayi}`
      }
    ]
  }

  return (
    <main className="immersive-reader-container">
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />

      {/* Minimalistic Floating Header */}
      <header className="fixed top-0 left-0 w-full z-50 p-4 sm:p-6 pointer-events-none">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          <div className="pointer-events-auto bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 shadow-2xl">
            <Breadcrumb>
              <BreadcrumbList className="text-white sm:text-base text-sm font-medium">
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="text-white/70 hover:text-white transition-colors">
                    Anasayfa
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-white/50" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-white font-bold tracking-tight">
                    {magazine.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="pointer-events-auto bg-red-600 px-4 py-2 rounded-lg shadow-xl border border-red-500">
            <span className="text-xs sm:text-sm font-black text-white uppercase tracking-widest">
              Sayı {sayi}
            </span>
          </div>
        </div>
      </header>

      {/* Reader Centerpiece - Fixed Height/Width via CSS Aspect Ratio */}
      <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="reader-aspect-ratio-box">
          {imageUrls.length > 0 ? (
            <FlipbookViewerErrorBoundary issueNumber={sayi}>
              <FlipbookViewer imageUrls={imageUrls} magazineId={magazine.id} />
            </FlipbookViewerErrorBoundary>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-neutral-900 rounded-lg">
              <div className="text-4xl mb-4">📚</div>
              <div className="text-lg font-medium">Henüz sayfa yüklenmedi</div>
            </div>
          )}
        </div>
      </div>

      {/* Background Decorator */}
      <div className="absolute inset-0 z-[-1] opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-red-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full"></div>
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
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || 'https://balkondergi.com'
  const canonicalUrl = `${baseUrl}/dergi/${sayi}`

  const title = `${magazine.title} - Balkon Dergisi`
  const description = `${magazine.title} - Sezai Karakoç Anadolu Lisesi öğrenci dergisi ${sayi}. sayısı`

  // Generate full storage URL for cover image
  const supabase = createPublicClient()
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
