'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TimelineContent } from '@/components/ui/timeline-animation'

interface MobileMenuButtonProps {
  headerRef: React.RefObject<HTMLDivElement | null>
  animationNum: number
  revealVariants: {
    visible: (i: number) => {
      y: number
      opacity: number
      filter: string
      transition: {
        delay: number
        duration: number
      }
    }
    hidden: {
      filter: string
      y: number
      opacity: number
    }
  }
}

export function MobileMenuButton({ headerRef, animationNum, revealVariants }: MobileMenuButtonProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      <TimelineContent
        as="button"
        animationNum={animationNum}
        timelineRef={headerRef}
        customVariants={revealVariants}
        type="button"
        aria-label="Menü"
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-navigation"
        className="md:hidden w-8 h-8 border border-gray-200 bg-white/80 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        )}
      </TimelineContent>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 py-4 absolute top-full left-0 right-0 bg-[#f9f9f9]/95 backdrop-blur-sm">
          <div className="max-w-6xl lg:max-w-7xl xl:max-w-8xl mx-auto px-4 lg:px-5 xl:px-6">
            <nav id="mobile-navigation" aria-label="Mobil navigasyon" className="flex flex-col gap-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-red-500 transition-colors font-medium text-base px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ana Sayfa
              </Link>
              <button
                type="button"
                onClick={() => {
                  const magazineSection = document.querySelector('[data-magazine-grid]')
                  magazineSection?.scrollIntoView({ behavior: 'smooth' })
                  setIsMobileMenuOpen(false)
                }}
                className="text-gray-600 hover:text-red-500 transition-colors font-medium text-base px-2 py-1 text-left"
              >
                Sayılar
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
