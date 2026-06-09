'use server'

import { getAuthenticatedClient } from '@/lib/supabase/server'
import { logger } from '@/lib/services/Logger'
import { requireAdmin } from '@/lib/services/authorization'

export interface PerformanceStats {
  metric: string
  count: number
  avg: number
  p50: number
  p75: number
  p95: number
  budget: number
  unit: string
}

export interface MetricAggregationResult {
  success: boolean
  data?: {
    stats: PerformanceStats[]
    totalCount: number
    timeframeDays: number
  }
  error?: {
    code: string
    message: string
  }
}

const BUDGETS = {
  LCP: { limit: 2500, unit: 'ms' },
  FID: { limit: 100, unit: 'ms' },
  CLS: { limit: 0.1, unit: '' },
  FCP: { limit: 1800, unit: 'ms' },
  TTFB: { limit: 800, unit: 'ms' },
  INP: { limit: 200, unit: 'ms' }
}

/**
 * Calculates a specific percentile from an array of numbers
 */
function getPercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    Math.max(Math.floor(sorted.length * percentile), 0),
    sorted.length - 1
  )
  return sorted[index]
}

/**
 * Aggregates performance metrics from Supabase for a given timeframe
 */
export async function getPerformanceDashboardData(days: number = 7): Promise<MetricAggregationResult> {
  try {
    // 1. Authorize admin
    await requireAdmin()
    const supabase = await getAuthenticatedClient()

    const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // 2. Fetch metrics
    const { data: metrics, error } = await supabase
      .from('performance_metrics')
      .select('name, value, created_at')
      .gte('created_at', dateLimit)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to query performance metrics from Supabase', {
        component: 'performance-actions',
        error: error.message,
        timeframeDays: days
      })
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message }
      }
    }

    if (!metrics || metrics.length === 0) {
      return {
        success: true,
        data: {
          stats: [],
          totalCount: 0,
          timeframeDays: days
        }
      }
    }

    // 3. Group by metric name
    const grouped: Record<string, number[]> = {}
    metrics.forEach((metric) => {
      if (!grouped[metric.name]) {
        grouped[metric.name] = []
      }
      grouped[metric.name].push(metric.value)
    })

    // 4. Calculate statistics
    const stats: PerformanceStats[] = Object.keys(grouped).map((name) => {
      const values = grouped[name]
      const count = values.length
      const sum = values.reduce((acc, v) => acc + v, 0)
      const avg = sum / count

      const budgetInfo = BUDGETS[name as keyof typeof BUDGETS] || { limit: 0, unit: '' }

      return {
        metric: name,
        count,
        avg,
        p50: getPercentile(values, 0.50),
        p75: getPercentile(values, 0.75),
        p95: getPercentile(values, 0.95),
        budget: budgetInfo.limit,
        unit: budgetInfo.unit
      }
    })

    return {
      success: true,
      data: {
        stats,
        totalCount: metrics.length,
        timeframeDays: days
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthorizationError') {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Yetkisiz erişim.' }
      }
    }

    logger.error('Unexpected error in getPerformanceDashboardData', {
      component: 'performance-actions',
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Beklenmedik bir sunucu hatası oluştu.' }
    }
  }
}
