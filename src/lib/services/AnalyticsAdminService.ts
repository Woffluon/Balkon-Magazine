import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { AnalyticsFilters } from '@/types/analytics'

export class AnalyticsAdminService {
  public async getAnalyticsData(filters: AnalyticsFilters) {
    const supabase = createAdminClient()

    let query = supabase
      .from('analytics_sessions')
      .select('id, started_at, last_active_at, device_type, magazine_id, user_agent', { count: 'exact' })

    if (filters.magazineIds && filters.magazineIds.length > 0) {
      query = query.in('magazine_id', filters.magazineIds)
    }

    if (filters.dateRange) {
      const { startIso, endIso } = filters.dateRange
      if (startIso) query = query.gte('started_at', startIso)
      if (endIso) query = query.lte('started_at', endIso)
    }

    if (filters.deviceType) {
      query = query.eq('device_type', filters.deviceType)
    }

    const { data: sessions, error } = await query

    if (error) throw error

    const validatedSessions = sessions || []

    const totalViews = validatedSessions.length
    const uniqueReaders = new Set(validatedSessions.map((s) => s.user_agent)).size

    const totalDuration =
      validatedSessions.reduce((acc, s) => {
        const start = new Date(s.started_at).getTime()
        const end = new Date(s.last_active_at).getTime()
        return acc + (end - start)
      }, 0) || 0

    const avgSessionDuration = totalViews > 0 ? totalDuration / totalViews : 0

    const dailyMap = new Map<string, { views: number; unique_users: number }>()

    validatedSessions.forEach((session) => {
      const date = session.started_at.split('T')[0]
      const curr = dailyMap.get(date) || { views: 0, unique_users: 0 }

      curr.views += 1
      curr.unique_users += 1

      dailyMap.set(date, curr)
    })

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        ...stats,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      summary: {
        totalViews,
        uniqueReaders,
        avgSessionDuration,
      },
      dailyStats,
    }
  }
}

export const analyticsAdminService = new AnalyticsAdminService()
