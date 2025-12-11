'use client'

import React, { useRef, useMemo } from 'react'
import type { Magazine } from '@/types/magazine'
import { MagazineCard } from '@/components/MagazineCard'
import { TimelineContent } from '@/components/ui/timeline-animation'
import { logger } from '@/lib/services/Logger'
import { TypeGuards, ValidationHelpers } from '@/lib/guards/runtimeTypeGuards'

type Props = {
  magazines: Magazine[]
  title: string
  showCount: boolean
}

/**
 * Validates magazines array using type guards
 * Ensures all magazines are valid objects with required properties
 */
function validateMagazinesArray(magazines: unknown): Magazine[] {
  if (!TypeGuards.isArray(magazines)) {
    logger.warn('Invalid magazines array provided to AnimatedGridSection', {
      component: 'AnimatedGridSection',
      operation: 'validateMagazinesArray',
      receivedType: typeof magazines
    })
    return []
  }
  
  return magazines.filter((magazine): magazine is Magazine => {
    if (!TypeGuards.isObject(magazine)) {
      logger.debug('Filtering out non-object magazine', {
        component: 'AnimatedGridSection',
        operation: 'validateMagazinesArray',
        magazine: String(magazine)
      })
      return false
    }
    
    // Check required properties
    const hasRequiredProps = TypeGuards.isString(magazine.id) &&
                            TypeGuards.isString(magazine.title) &&
                            TypeGuards.isNumber(magazine.issue_number)
    
    if (!hasRequiredProps) {
      logger.debug('Filtering out magazine with missing required properties', {
        component: 'AnimatedGridSection',
        operation: 'validateMagazinesArray',
        magazine: JSON.stringify(magazine)
      })
      return false
    }
    
    return true
  })
}

export const AnimatedGridSection = React.memo(function AnimatedGridSection({ 
  magazines, 
  title, 
  showCount 
}: Props) {
  // Validate props using type guards (Requirement 7.2)
  const validatedMagazines = useMemo(() => validateMagazinesArray(magazines), [magazines])
  
  const validatedTitle = ValidationHelpers.validateOrDefault(
    title,
    TypeGuards.isNonEmptyString,
    'Tüm Sayılar',
    'AnimatedGridSection.title'
  )
  
  const validatedShowCount = ValidationHelpers.validateOrDefault(
    showCount,
    TypeGuards.isBoolean,
    true,
    'AnimatedGridSection.showCount'
  )
  
  const gridRef = useRef<HTMLDivElement>(null)

  const revealVariants = useMemo(() => ({
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: "easeOut" as const
      },
    }),
    hidden: {
      filter: "blur(4px)",
      y: 20,
      opacity: 0,
    },
  }), [])

  return (
    <section data-magazine-grid className="w-full relative" ref={gridRef}>
      {/* Header Section */}
      <div className="relative z-10 mb-16">
        <TimelineContent
          as="div"
          animationNum={0}
          timelineRef={gridRef}
          customVariants={revealVariants}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
              {validatedTitle}
            </h2>
            <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
          </div>
          
          {validatedShowCount && (
            <div className="flex items-center justify-center gap-4 text-gray-600">
              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent w-20"></div>
              <span className="text-lg font-medium px-6 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
                Dergi Sayısı: {validatedMagazines.length}
              </span>
              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent w-20"></div>
            </div>
          )}
        </TimelineContent>

        {/* Subtitle with Balkon Theme */}
        <TimelineContent
          as="div"
          animationNum={1}
          timelineRef={gridRef}
          customVariants={revealVariants}
          className="text-center mb-12"
        >
          <p className="text-gray-600 text-lg leading-relaxed max-w-4xl mx-auto mb-4">
            <span className="font-semibold text-red-500">&ldquo;Şu içimizin de balkonu olsaydı, çıkıp arada nefes alsaydık.&rdquo;</span>
          </p>
          <p className="text-gray-500 text-base max-w-3xl mx-auto">
            Sezai Karakoç Anadolu Lisesi&apos;nin en çiçekli, keyifli ve mutlu anlarının kayda geçtiği dijital balkonumuza hoş geldiniz. 
            Her sayfa yeni bir hikaye, her hikaye yeni bir nefes...
          </p>
        </TimelineContent>
      </div>

      {/* Magazine Grid */}
      <div className="relative z-10">
        <div 
          className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 xs:gap-4 sm:gap-6 lg:gap-8"
        >
          {validatedMagazines.map((magazine, index) => (
            <TimelineContent
              key={magazine.id}
              as="div"
              animationNum={index + 2}
              timelineRef={gridRef}
              customVariants={revealVariants}
              className="relative group"
            >
              {/* Magazine Card with Enhanced Effects */}
              <div className="relative">
                {/* Card wrapper with clean border */}
                <div className="relative bg-white rounded-xl p-3 shadow-lg border border-gray-100 transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-3 group-hover:border-red-200">
                  <MagazineCard magazine={magazine} />
                </div>
              </div>
            </TimelineContent>
          ))}
        </div>
      </div>
    </section>
  )
})
