'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { logger } from '@/lib/services/Logger'

const BUDGETS = {
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100,  // First Input Delay (ms)
  CLS: 0.1,  // Cumulative Layout Shift (fraction)
  FCP: 1800, // First Contentful Paint (ms)
  TTFB: 800, // Time to First Byte (ms)
  INP: 200   // Interaction to Next Paint (ms)
}

export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const { name, value, id } = metric
    const limit = BUDGETS[name as keyof typeof BUDGETS]

    // 1. Logging and budget check in development
    if (process.env.NODE_ENV === 'development') {
      const isExceeded = limit !== undefined && value > limit
      const logMsg = `[Web Vital] ${name}: ${value.toFixed(2)}${name === 'CLS' ? '' : 'ms'} (Budget: ${limit}${name === 'CLS' ? '' : 'ms'})`
      
      if (isExceeded) {
        console.warn(`⚠️ Budget Exceeded! ${logMsg}`)
      } else {
        console.log(`✅ ${logMsg}`)
      }
    }

    // 2. Production reporting using sendBeacon
    if (process.env.NODE_ENV === 'production') {
      try {
        const payload = {
          id,
          name,
          value,
          path: window.location.pathname,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }
        
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/vitals', blob)
      } catch (err) {
        logger.warn('Failed to send Web Vitals metrics via sendBeacon', {
          component: 'WebVitalsReporter',
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }
  })

  return null
}
