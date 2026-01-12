import Link from 'next/link'
import Image from 'next/image'
import React from 'react'
import type { Magazine } from '@/types/magazine'
import { getMagazineCoverUrl } from '@/lib/utils/storage'
import { logger } from '@/lib/services/Logger'
import { ErrorHandler } from '@/lib/errors/errorHandler'
import { TypeGuards, ValidationHelpers } from '@/lib/guards/runtimeTypeGuards'

type Props = {
  magazine: Magazine
  isLatest?: boolean
}

/**
 * Validates magazine data using type guards
 * Ensures magazine object has required properties with correct types
 */
function validateMagazineData(magazine: unknown): Magazine | null {
  if (!TypeGuards.isObject(magazine)) {
    logger.warn('Invalid magazine data provided to MagazineCard', {
      component: 'MagazineCard',
      operation: 'validateMagazineData',
      receivedType: typeof magazine
    })
    return null
  }

  // Validate required properties using type guards (Requirement 7.2)
  try {
    const validatedMagazine = {
      id: ValidationHelpers.validateOrThrow(
        magazine.id,
        TypeGuards.isString,
        'string',
        'magazine.id'
      ),
      title: ValidationHelpers.validateOrThrow(
        magazine.title,
        TypeGuards.isString,
        'string',
        'magazine.title'
      ),
      issue_number: ValidationHelpers.validateOrThrow(
        magazine.issue_number,
        TypeGuards.isNumber,
        'number',
        'magazine.issue_number'
      ),
      cover_image_url: ValidationHelpers.validateOrDefault(
        magazine.cover_image_url,
        TypeGuards.isString,
        '',
        'magazine.cover_image_url'
      )
    } as Magazine

    return validatedMagazine
  } catch (error) {
    const handledError = ErrorHandler.handleUnknownError(error)
    logger.error('Magazine data validation failed', {
      component: 'MagazineCard',
      operation: 'validateMagazineData',
      error: handledError.message,
      magazine: JSON.stringify(magazine)
    })
    return null
  }
}

export const MagazineCard = React.memo(function MagazineCard({ magazine, isLatest }: Props) {
  // Validate magazine data using type guards (Requirement 7.2)
  const validatedMagazine = validateMagazineData(magazine)

  if (!validatedMagazine) {
    logger.error('MagazineCard received invalid magazine data', {
      component: 'MagazineCard',
      operation: 'render',
      magazine: JSON.stringify(magazine)
    })

    // Return error placeholder
    return (
      <div className="group block w-full">
        <div className="relative overflow-hidden rounded-xl bg-red-50 aspect-[3/4] w-full border border-red-200">
          <div className="w-full h-full flex flex-col items-center justify-center text-red-600 p-4">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="text-sm font-medium text-center">Geçersiz Dergi Verisi</div>
            <div className="text-xs text-center mt-1">Lütfen sayfayı yenileyin</div>
          </div>
        </div>
      </div>
    )
  }

  const coverUrl = getMagazineCoverUrl(validatedMagazine.cover_image_url)

  return (
    <Link
      key={validatedMagazine.id}
      href={`/dergi/${validatedMagazine.issue_number}`}
      className="group block w-full relative"
      aria-label={`Sayı ${validatedMagazine.issue_number} dergisini oku${isLatest ? ', Yeni sayı' : ''}`}
    >
      {/* "Yeni" Badge - Redesigned: Top-Left Burst Sticker */}
      {isLatest && (
        <div
          className="absolute -top-6 -left-6 z-40 transform -rotate-12 transition-all duration-500 group-hover:rotate-0 group-hover:scale-110"
          aria-hidden="true"
        >
          <div
            className="bg-red-600 text-white font-black text-[9px] sm:text-[11px] tracking-widest uppercase shadow-2xl border-2 border-white flex items-center justify-center"
            style={{
              clipPath: 'polygon(50% 0%, 58% 18%, 78% 10%, 75% 30%, 95% 35%, 80% 50%, 95% 65%, 75% 70%, 78% 90%, 58% 82%, 50% 100%, 42% 82%, 22% 90%, 25% 70%, 5% 65%, 20% 50%, 5% 35%, 25% 30%, 22% 10%, 42% 18%)',
              width: '56px',
              height: '56px'
            }}
          >
            <span className="relative z-10 transform scale-110">YENİ</span>
          </div>
        </div>
      )}

      {/* Card Container */}
      <div className="relative overflow-hidden rounded-xl bg-white aspect-[3/4] w-full transition-all duration-500 group-hover:shadow-xl">
        {/* Cover Image */}
        <div className="relative w-full h-full overflow-hidden rounded-xl">
          {coverUrl ? (
            <>
              <Image
                src={coverUrl}
                alt={`${validatedMagazine.title} kapak görseli - Sayı ${validatedMagazine.issue_number}`}
                fill
                className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                style={{ willChange: 'transform' }}
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=="
                loading="lazy"
                onError={(imageError) => {
                  // Handle image load error with proper logging (Requirement 4.1)
                  logger.warn('Magazine cover image failed to load', {
                    component: 'MagazineCard',
                    operation: 'coverImageOnError',
                    magazineId: validatedMagazine.id,
                    issueNumber: validatedMagazine.issue_number,
                    coverUrl,
                    error: imageError instanceof Event ? 'Image load error' : String(imageError)
                  })
                }}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Artistic frame effect */}
              <div className="absolute inset-2 border-2 border-white/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Corner decorations */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-400 border border-gray-200 rounded-xl">
              <div className="text-4xl mb-3">📚</div>
              <div className="text-sm font-medium">Kapak Resmi</div>
              <div className="text-xs">Yakında...</div>
            </div>
          )}

          {/* Reading indicator */}
          <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110" style={{ willChange: 'transform, opacity' }}>
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-gray-700 shadow-sm border border-white/20">
              OKU
            </div>
          </div>

          {/* Floating page indicator */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="bg-red-500/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold shadow-lg">
              →
            </div>
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="pt-4 w-full">
        <div className="space-y-3">
          {/* Magazine Title */}
          <h3 className="font-bold text-sm sm:text-base lg:text-lg line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] text-gray-900 group-hover:text-red-600 transition-colors duration-300 leading-tight">
            {validatedMagazine.title}
          </h3>

          {/* Issue Info & Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                Sayı {validatedMagazine.issue_number}
              </span>
            </div>

            {/* Read more indicator */}
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" style={{ willChange: 'transform, opacity' }}>
              <svg
                className="w-4 h-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>

          {/* Clean decorative underline */}
          <div className="h-1 bg-red-500 w-0 group-hover:w-full transition-all duration-500 ease-out rounded-full"></div>
        </div>
      </div>
    </Link>
  )
}, (prevProps: Props, nextProps: Props) => {
  // Custom comparison function with type-safe property access (Requirement 7.2)
  try {
    const prevMagazine = validateMagazineData(prevProps.magazine)
    const nextMagazine = validateMagazineData(nextProps.magazine)

    // If either validation fails, force re-render
    if (!prevMagazine || !nextMagazine) {
      return false
    }

    // Deep equality check with validated data
    return prevMagazine.id === nextMagazine.id &&
      prevMagazine.title === nextMagazine.title &&
      prevMagazine.cover_image_url === nextMagazine.cover_image_url &&
      prevMagazine.issue_number === nextMagazine.issue_number &&
      prevProps.isLatest === nextProps.isLatest
  } catch (error) {
    // If comparison fails, force re-render for safety
    logger.warn('MagazineCard comparison failed, forcing re-render', {
      component: 'MagazineCard',
      operation: 'memoComparison',
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
})
