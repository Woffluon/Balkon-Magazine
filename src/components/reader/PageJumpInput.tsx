'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { logger } from '@/lib/services/Logger'

interface PageJumpInputProps {
  /** Current page index (0-based) */
  currentPage: number

  /** Total number of pages */
  totalPages: number

  /** Whether navigation is locked */
  isLocked: boolean

  /** Current zoom level (navigation disabled when > 1) */
  zoomLevel: number

  /** Whether component is visible (toolbar open/collapsed) */
  isVisible: boolean

  /** Whether mobile viewport is active */
  isMobile: boolean

  /** Callback triggered when user requests navigation */
  onPageJump: (targetPageIndex: number) => void
}

/**
 * Component that displays the current page number in an editable input field
 * and reveals a "Go" button when the value is modified.
 */
export function PageJumpInput({
  currentPage,
  totalPages,
  isLocked,
  zoomLevel,
  isVisible,
  isMobile,
  onPageJump
}: PageJumpInputProps) {
  const displayPage = currentPage + 1
  const [inputValue, setInputValue] = useState(String(displayPage))
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync state when page changes externally (unless user is actively typing)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(String(displayPage))
    }
  }, [displayPage, isFocused])

  if (!isVisible) {
    return null
  }

  const isDisabled = isLocked || zoomLevel > 1

  // Show "Git" button if value has changed and is different from current page
  const isEdited = inputValue !== '' && inputValue !== String(displayPage)
  const showGoButton = isEdited && !isDisabled

  const validateAndNavigate = (rawInput: string) => {
    const numericValue = rawInput.replace(/[^0-9]/g, '')

    if (!numericValue) {
      // Empty input defaults to page 1 (index 0)
      onPageJump(0)
      setInputValue('1')
      return
    }

    let pageNumber = parseInt(numericValue, 10)

    if (pageNumber > totalPages) {
      logger.warn('Page jump input clamped to valid range', {
        component: 'PageJumpInput',
        operation: 'validateAndNavigate',
        requestedPage: pageNumber,
        clampedPage: totalPages,
        totalPages
      })
      pageNumber = totalPages
    } else if (pageNumber < 1) {
      pageNumber = 1
    }

    const pageIndex = pageNumber - 1
    onPageJump(pageIndex)
    setInputValue(String(pageNumber))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      validateAndNavigate(inputValue)
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setInputValue(String(displayPage))
      inputRef.current?.blur()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Prevent propagating to parent flipbook navigation
      e.stopPropagation()
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleGoMouseDown = (e: React.MouseEvent) => {
    // Prevent button click from blurring the input immediately
    e.preventDefault()
  }

  const handleGoClick = () => {
    validateAndNavigate(inputValue)
    inputRef.current?.blur()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setInputValue(val)
  }

  return (
    <div className="flex items-center gap-1.5 text-white/90 font-bold text-sm" id="page-jump-container">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isDisabled}
          aria-label="Sayfa numarası"
          className="bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/10 rounded-md text-white font-bold text-center w-10 h-7 focus:outline-none transition-all disabled:opacity-50"
        />
        <span className="opacity-40 whitespace-nowrap">/ {totalPages}</span>
      </div>

      {showGoButton && (
        <button
          type="button"
          onMouseDown={handleGoMouseDown}
          onClick={handleGoClick}
          aria-label="Girilen sayfaya git"
          className="rounded-md bg-white/25 hover:bg-white/35 active:bg-white/45 text-white font-bold text-xs h-7 px-2.5 transition-all flex items-center justify-center gap-0.5"
        >
          {isMobile ? <ChevronRight className="w-3.5 h-3.5" /> : 'Git'}
        </button>
      )}
    </div>
  )
}
