'use client'

import React, { useState, useEffect } from 'react'
import Image, { ImageProps } from 'next/image'
import { logger } from '@/lib/services/Logger'

// Helper to generate a SVG Gaussian Blur placeholder
export function generateBlurPlaceholder(width: number = 300, height: number = 400): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <filter id="b">
        <feGaussianBlur stdDeviation="20" />
      </filter>
      <rect width="100%" height="100%" fill="#e5e7eb" />
      <rect width="100%" height="100%" fill="#f3f4f6" filter="url(#b)" />
    </svg>
  `
  // Convert to base64 SVG data URL
  const base64 = typeof window !== 'undefined' 
    ? btoa(unescape(encodeURIComponent(svg))) 
    : Buffer.from(svg).toString('base64')
  
  return `data:image/svg+xml;base64,${base64}`
}

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string
  fallbackSrc?: string
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  loading,
  className = '',
  sizes,
  unoptimized = true, // Preserve default unoptimized configuration requirement
  fallbackSrc,
  ...rest
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [effectiveQuality, setEffectiveQuality] = useState<number>(90)

  // 1. Connection-aware Quality Adaptation using Network Information API
  useEffect(() => {
    if (typeof navigator === 'undefined') return

    interface NetworkConnection {
      effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
      saveData: boolean
      addEventListener: (type: string, listener: () => void) => void
      removeEventListener: (type: string, listener: () => void) => void
    }

    interface ExtendedNavigator extends Navigator {
      connection?: NetworkConnection
      mozConnection?: NetworkConnection
      webkitConnection?: NetworkConnection
    }

    const nav = navigator as ExtendedNavigator
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection

    if (connection) {
      const updateQuality = () => {
        const type = connection.effectiveType
        logger.debug('Network condition detected', {
          component: 'OptimizedImage',
          effectiveType: type,
          saveData: connection.saveData
        })

        if (type === 'slow-2g' || type === '2g' || type === '3g' || connection.saveData) {
          setEffectiveQuality(60) // Lower quality for slower connection/save-data
        } else {
          setEffectiveQuality(90) // Normal high quality
        }
      }

      updateQuality()
      connection.addEventListener('change', updateQuality)
      return () => {
        connection.removeEventListener('change', updateQuality)
      }
    }
  }, [])

  // Construct modified URL with quality if supported (for R2/Supabase dynamic options)
  const getProcessedSrc = () => {
    if (hasError && fallbackSrc) {
      return fallbackSrc
    }

    if (!src) return ''

    // If it's an external absolute URL and supports query params, append q
    if (src.includes('supabase.co') || src.includes('r2.cloudflarestorage.com') || src.startsWith('http')) {
      try {
        const url = new URL(src, typeof window !== 'undefined' ? window.location.origin : undefined)
        // If Supabase Storage, we can append transform options
        if (src.includes('/storage/v1/object/public/')) {
          // Note: Supabase requires transform endpoint for on-the-fly resizing.
          // For simplicity, we just pass quality query parameter.
          url.searchParams.set('quality', effectiveQuality.toString())
        } else {
          url.searchParams.set('q', effectiveQuality.toString())
        }
        return url.toString()
      } catch {
        return src
      }
    }
    return src
  }

  const processedSrc = getProcessedSrc()

  // Default width & height for computing placeholder if missing
  const computedWidth = typeof width === 'number' ? width : 400
  const computedHeight = typeof height === 'number' ? height : 300

  // 2. SVG Blur Placeholder Data URL
  const blurData = generateBlurPlaceholder(computedWidth, computedHeight)

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    logger.warn('Failed to load optimized image', {
      component: 'OptimizedImage',
      src: processedSrc,
      alt
    })
    setHasError(true)
  }

  // Fallback UI when load fails completely
  if (hasError && !fallbackSrc) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-neutral-100 text-neutral-400 border border-neutral-200 rounded-xl ${className}`}
        style={{ width: width || '100%', height: height || '100%', minHeight: '120px' }}
      >
        <span className="text-xl mb-1">⚠️</span>
        <span className="text-[10px] font-medium text-center px-2">Resim yüklenemedi</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ aspectRatio: width && height ? `${width}/${height}` : 'auto' }}>
      {/* Visual blurred placeholder displayed until primary image is fully loaded */}
      {!isLoaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={blurData}
          alt="Yükleniyor..."
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${className}`}
          style={{ filter: 'blur(10px)' }}
        />
      )}
      
      <Image
        src={processedSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        // fetchpriority is set via priority helper
        loading={priority ? undefined : (loading || 'lazy')}
        className={`transition-all duration-500 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${className}`}
        sizes={sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
        unoptimized={unoptimized}
        onLoad={handleLoad}
        onError={handleError}
        {...rest}
      />
    </div>
  )
}
