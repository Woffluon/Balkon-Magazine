'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { logger } from '@/lib/services/Logger'

// 1. FlipbookViewer (ssr: false)
export const DynamicFlipbookViewer = dynamic(
  () =>
    import('@/components/FlipbookViewer').catch((err) => {
      logger.error('Dynamic FlipbookViewer import failed', { error: err })
      return {
        default: () => (
          <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-xl text-center">
            <p className="font-medium">Dergi okuyucu yüklenemedi.</p>
            <p className="text-xs mt-1">Lütfen bağlantınızı kontrol edip tekrar deneyin.</p>
          </div>
        ),
      }
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex flex-col items-center justify-center bg-neutral-900 text-sm text-neutral-400 gap-3">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p>Dergi Görüntüleyici Yükleniyor...</p>
      </div>
    ),
  }
)

// 2. Hero (ssr: true)
export const DynamicHero = dynamic(
  () =>
    import('@/components/Hero').then((mod) => mod.Hero).catch((err) => {
      logger.error('Dynamic Hero import failed', { error: err })
      return {
        default: () => (
          <div className="py-20 bg-[#f9f9f9] text-center text-gray-500">
            <h1 className="text-3xl font-bold">Balkon Dergisi</h1>
            <p className="mt-2 text-sm">Keyfini çıkar, derin bir nefes al ve rahatla.</p>
          </div>
        ),
      }
    }),
  {
    ssr: true,
    loading: () => (
      <div className="py-20 bg-[#f9f9f9] flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    ),
  }
)

// 3. AnalyticsDashboard (ssr: false)
export const DynamicAnalyticsDashboard = dynamic(
  () =>
    import('@/app/(admin)/admin/analytics/AnalyticsDashboardClient').then((mod) => mod.AnalyticsDashboardClient).catch((err) => {
      logger.error('Dynamic AnalyticsDashboard import failed', { error: err })
      return {
        default: () => (
          <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-xl text-center">
            <p className="font-medium">İstatistik paneli yüklenemedi.</p>
            <p className="text-xs mt-1">Lütfen internet bağlantınızı kontrol edip sayfayı yenileyin.</p>
          </div>
        ),
      }
    }),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-gray-100">
        <div className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500">İstatistikler Yükleniyor...</p>
      </div>
    ),
  }
)

// 4. Preload PDF Worker helper
export const loadPDFWorker = () => {
  if (typeof window === 'undefined') return

  try {
    const workerUrl = '/pdf.worker.min.mjs'
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = workerUrl
    link.as = 'script'
    document.head.appendChild(link)
    logger.debug('PDF Worker prefetched successfully', { component: 'dynamic-imports' })
  } catch (error) {
    logger.warn('Failed to prefetch PDF worker', {
      component: 'dynamic-imports',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
