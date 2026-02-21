'use server'

import { headers, cookies } from 'next/headers'
import { getAuthenticatedClient } from '@/lib/supabase/server'
import { logger } from '@/lib/services/Logger'
import { ErrorHandler, type Result } from '@/lib/errors/errorHandler'

/**
 * Tracks a magazine view. To be called from the public magazine reader page.
 * Uses the increment_magazine_view RPC function.
 */
export async function trackMagazineView(magazineId: string): Promise<Result<void>> {
    try {
        const headerList = await headers()

        // Extract IP and User Agent for rudimentary tracking/spam prevention
        const forwardedFor = headerList.get('x-forwarded-for')
        let viewerIp = forwardedFor ? forwardedFor.split(',')[0] : headerList.get('x-real-ip')

        // Fallback if IP cannot be detected
        if (!viewerIp) {
            viewerIp = 'unknown-ip'
        }

        const userAgent = headerList.get('user-agent') || 'unknown-ua'

        // Cookie / Session management
        const cookieStore = await cookies()
        let sessionId = cookieStore.get('viewer_session')?.value

        if (!sessionId) {
            sessionId = crypto.randomUUID()
            // Tarayıcıya 1 yıllık anonim session cookie'si atıyoruz
            cookieStore.set('viewer_session', sessionId, {
                maxAge: 60 * 60 * 24 * 365,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            })
        }

        // In server actions, use getAuthenticatedClient to get a fully configured Server Client instance 
        // instead of the browser client for executing DB modifications safely.
        // Given anyone can track, we use general privileges, but still need the server client
        const { createPublicClient } = await import('@/lib/supabase/server')
        const supabase = createPublicClient()

        // Call the RPC function created in the migration
        const { error } = await supabase.rpc('increment_magazine_view', {
            p_magazine_id: magazineId,
            p_session_id: sessionId,
            p_viewer_ip: viewerIp,
            p_user_agent: userAgent
        })

        if (error) {
            logger.error('Failed to track magazine view', {
                operation: 'trackMagazineView',
                magazineId,
                errorCode: error.code,
                errorMessage: error.message
            })
            const appError = ErrorHandler.handleSupabaseError(error, 'insert', 'magazine_views')
            return ErrorHandler.failure(appError)
        }

        return ErrorHandler.success(undefined)
    } catch (error) {
        const appError = ErrorHandler.handleUnknownError(error)
        logger.error('Unexpected error tracking magazine view', {
            operation: 'trackMagazineView',
            magazineId,
            error: appError
        })
        return ErrorHandler.failure(appError)
    }
}

/**
 * Analytics Data Types
 */
export interface MagazineViewStats {
    magazine_id: string
    title: string
    issue_number: number
    total_views: number
}

export interface DailyViewStats {
    date: string
    views: number
}

export interface AnalyticsDashboardData {
    totalViewsAllTime: number
    viewsLast30Days: number
    topMagazines: MagazineViewStats[]
    dailyViews: DailyViewStats[]
}

/**
 * Fetches analytics data for the admin dashboard.
 * Requires authentication.
 */
export async function getAnalyticsDashboardData(days: number = 30): Promise<Result<AnalyticsDashboardData>> {
    try {
        const supabase = await getAuthenticatedClient()

        // 1. Get total views for all time
        const { count: totalViewsAllTime, error: totalErr } = await supabase
            .from('magazine_views')
            .select('*', { count: 'exact', head: true })

        if (totalErr) throw totalErr

        // 2. Get views for the specified date range (default 30 days)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        const startDateStr = startDate.toISOString()

        const { count: viewsGivenRange, error: rangeErr } = await supabase
            .from('magazine_views')
            .select('*', { count: 'exact', head: true })
            .gte('viewed_at', startDateStr)

        if (rangeErr) throw rangeErr

        // 3. Get top magazines by view count
        // Normally we'd do a GROUP BY in Supabase using an RPC or a View
        // Since we don't have a view yet, we can fetch all relevant views and group them in memory 
        // Optimization: If dataset grows large, this needs a DB View. For now, doing it via a simple fetch.
        const { data: allMagazines, error: magErr } = await supabase
            .from('magazines')
            .select('id, title, issue_number')

        if (magErr) throw magErr

        const { data: recentViews, error: recentErr } = await supabase
            .from('magazine_views')
            .select('magazine_id, viewed_at')
            .gte('viewed_at', startDateStr)

        if (recentErr) throw recentErr

        // Process top magazines
        const magStatsMap: Record<string, MagazineViewStats> = {}

        // Initialize map
        allMagazines.forEach(mag => {
            magStatsMap[mag.id] = {
                magazine_id: mag.id,
                title: mag.title,
                issue_number: mag.issue_number,
                total_views: 0
            }
        })

        // Prepare Daily Views Array
        const dailyViewsMap: Record<string, number> = {}
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0] // YYYY-MM-DD
            dailyViewsMap[dateStr] = 0
        }

        // Tally up the views
        recentViews?.forEach(view => {
            // Tally magazine stats
            if (magStatsMap[view.magazine_id]) {
                magStatsMap[view.magazine_id].total_views++
            }

            // Tally daily stats
            const viewDate = new Date(view.viewed_at).toISOString().split('T')[0]
            if (dailyViewsMap[viewDate] !== undefined) {
                dailyViewsMap[viewDate]++
            }
        })

        const topMagazines = Object.values(magStatsMap)
            .sort((a, b) => b.total_views - a.total_views)
            .slice(0, 5) // Top 5

        const dailyViews = Object.entries(dailyViewsMap).map(([date, views]) => ({ date, views }))

        const dashboardData: AnalyticsDashboardData = {
            totalViewsAllTime: totalViewsAllTime || 0,
            viewsLast30Days: viewsGivenRange || 0,
            topMagazines,
            dailyViews
        }

        return ErrorHandler.success(dashboardData)
    } catch (error) {
        const appError = ErrorHandler.handleUnknownError(error)
        logger.error('Failed to fetch analytics data', {
            operation: 'getAnalyticsDashboardData',
            error: appError
        })
        return ErrorHandler.failure(appError)
    }
}
