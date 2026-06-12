'use server'

import { createHash } from 'node:crypto'
import { headers, cookies } from 'next/headers'
import { getAuthenticatedClient } from '@/lib/supabase/server'
import { logger } from '@/lib/services/Logger'
import { ErrorHandler, type Result } from '@/lib/errors/errorHandler'
import { rateLimiter } from '@/lib/services/rateLimiting'
import { requireAdmin } from '@/lib/services/authorization'
import { PageEngagementBatchSchema, type PageEngagementEvent } from '@/lib/validators'

const VIEWER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
    return UUID_PATTERN.test(value)
}

function hashAnalyticsValue(value: string): string {
    const daySalt = new Date().toISOString().slice(0, 10)
    return createHash('sha256')
        .update(`${daySalt}:${value}`)
        .digest('hex')
}

function getUserAgentFamily(userAgent: string): string {
    const normalized = userAgent.toLowerCase()

    if (normalized.includes('iphone') || normalized.includes('android mobile')) {
        return 'Mobil'
    }

    if (normalized.includes('ipad') || normalized.includes('tablet') || normalized.includes('android')) {
        return 'Tablet'
    }

    if (!userAgent || userAgent === 'unknown-ua') {
        return 'Bilinmeyen'
    }

    return 'Masaüstü'
}

/**
 * Tracks a magazine view. To be called from the public magazine reader page.
 * Uses the increment_magazine_view RPC function.
 */
export async function trackMagazineView(magazineId: string): Promise<Result<void>> {
    try {
        if (!isUuid(magazineId)) {
            const validationError = ErrorHandler.handleUnknownError(new Error('Invalid magazine id'))
            return ErrorHandler.failure(validationError)
        }

        const headerList = await headers()

        // Extract IP and User Agent for rudimentary tracking/spam prevention
        const forwardedFor = headerList.get('x-forwarded-for')
        let viewerIp = forwardedFor ? forwardedFor.split(',')[0] : headerList.get('x-real-ip')

        // Fallback if IP cannot be detected
        if (!viewerIp) {
            viewerIp = 'unknown-ip'
        }

        const userAgent = headerList.get('user-agent') || 'unknown-ua'
        const rateLimitKey = `${magazineId}:${viewerIp}`

        if (!rateLimiter.checkViewTrackingLimit(rateLimitKey)) {
            return ErrorHandler.success(undefined)
        }

        rateLimiter.recordViewTrackingAttempt(rateLimitKey)

        // Cookie / Session management
        const cookieStore = await cookies()
        let sessionId = cookieStore.get('viewer_session')?.value

        if (!sessionId || !isUuid(sessionId)) {
            sessionId = crypto.randomUUID()
            cookieStore.set('viewer_session', sessionId, {
                maxAge: VIEWER_COOKIE_MAX_AGE_SECONDS,
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
            p_viewer_ip_hash: hashAnalyticsValue(viewerIp),
            p_user_agent_family: getUserAgentFamily(userAgent)
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
    id: string
    title: string
    issue_number: number
    total_views: number
}

export interface DailyViewStats {
    date: string
    views: number
    unique_views: number
}

export interface DeviceStats {
    device: string
    count: number
}

export interface AnalyticsDashboardData {
    total_views: number
    unique_visitors: number
    daily_stats: DailyViewStats[]
    top_magazines: MagazineViewStats[]
    device_stats: DeviceStats[]
    // For legacy support/compatibility if needed
    totalViewsAllTime: number
}

/**
 * Fetches analytics data for the admin dashboard.
 * Supports filtering by days or specific date range and magazine.
 */
export async function getAnalyticsDashboardData(
    daysOrRange: number | { start: string; end: string } = 30,
    magazineId: string | null = null
): Promise<Result<AnalyticsDashboardData>> {
    try {
        await requireAdmin()
        const supabase = await getAuthenticatedClient()

        let startDateStr: string
        let endDateStr: string = new Date().toISOString()

        if (typeof daysOrRange === 'number') {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - daysOrRange)
            startDateStr = startDate.toISOString()
        } else {
            startDateStr = daysOrRange.start
            endDateStr = daysOrRange.end
        }

        // 1. Call the new advanced analytics RPC
        const { data: analyticsData, error: rpcErr } = await supabase.rpc('get_advanced_analytics', {
            p_start_date: startDateStr,
            p_end_date: endDateStr,
            p_magazine_id: magazineId
        })

        if (rpcErr) {
            logger.error('Failed to call get_advanced_analytics RPC', {
                operation: 'getAnalyticsDashboardData',
                error: rpcErr
            })
            throw rpcErr
        }

        const result: AnalyticsDashboardData = {
            ...analyticsData,
            totalViewsAllTime: analyticsData.total_views_all_time || 0
        }

        return ErrorHandler.success(result)
    } catch (error) {
        const appError = ErrorHandler.handleUnknownError(error)
        logger.error('Failed to fetch analytics data', {
            operation: 'getAnalyticsDashboardData',
            error: appError
        })
        return ErrorHandler.failure(appError)
    }
}

/**
 * Tracks a batch of page engagement events. Called from client hook.
 */
export async function trackPageEngagement(events: PageEngagementEvent[]): Promise<Result<void>> {
    try {
        const validationResult = PageEngagementBatchSchema.safeParse(events)
        if (!validationResult.success) {
            const appError = ErrorHandler.handleUnknownError(new Error('Invalid page engagement payload'))
            logger.warn('Validation failed for page engagement events', {
                operation: 'trackPageEngagement',
                errors: validationResult.error.issues
            })
            return ErrorHandler.failure(appError)
        }

        const validatedEvents = validationResult.data

        const cookieStore = await cookies()
        let sessionId = cookieStore.get('viewer_session')?.value

        if (!sessionId || !isUuid(sessionId)) {
            sessionId = crypto.randomUUID()
            cookieStore.set('viewer_session', sessionId, {
                maxAge: VIEWER_COOKIE_MAX_AGE_SECONDS,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            })
        }

        const { createPublicClient } = await import('@/lib/supabase/server')
        const supabase = createPublicClient()

        const rows = validatedEvents.map(event => ({
            session_id: sessionId,
            magazine_id: event.magazineId,
            page_number: event.pageNumber,
            duration_seconds: event.durationSeconds,
        }))

        const { error } = await supabase
            .from('page_engagement')
            .insert(rows)

        if (error) {
            logger.error('Failed to write page engagement to database', {
                operation: 'trackPageEngagement',
                errorCode: error.code,
                errorMessage: error.message
            })
            const appError = ErrorHandler.handleSupabaseError(error, 'insert', 'page_engagement')
            return ErrorHandler.failure(appError)
        }

        return ErrorHandler.success(undefined)
    } catch (error) {
        const appError = ErrorHandler.handleUnknownError(error)
        logger.error('Unexpected error tracking page engagement', {
            operation: 'trackPageEngagement',
            error: appError
        })
        return ErrorHandler.failure(appError)
    }
}

export interface PageAnalyticsData {
    page_number: number
    total_views: number
    unique_viewers: number
    average_duration_seconds: number
}

/**
 * Fetches page view drop-off and engagement heatmaps for the admin dashboard.
 */
export async function getPageAnalytics(magazineId: string, days: number): Promise<Result<PageAnalyticsData[]>> {
    try {
        await requireAdmin()
        if (!isUuid(magazineId)) {
            const validationError = ErrorHandler.handleUnknownError(new Error('Invalid magazine id'))
            return ErrorHandler.failure(validationError)
        }

        const supabase = await getAuthenticatedClient()

        const { data, error } = await supabase.rpc('get_page_analytics', {
            p_magazine_id: magazineId,
            p_days: days
        })

        if (error) {
            logger.error('Failed to fetch page analytics', {
                operation: 'getPageAnalytics',
                magazineId,
                days,
                error
            })
            const appError = ErrorHandler.handleSupabaseError(error, 'select', 'page_engagement')
            return ErrorHandler.failure(appError)
        }

        return ErrorHandler.success(data as PageAnalyticsData[])
    } catch (error) {
        const appError = ErrorHandler.handleUnknownError(error)
        logger.error('Unexpected error fetching page analytics', {
            operation: 'getPageAnalytics',
            magazineId,
            days,
            error: appError
        })
        return ErrorHandler.failure(appError)
    }
}
