import React from 'react'
import { createClient } from '@/lib/supabase/server'
import AnalyticsDashboardClient from './AnalyticsDashboardClient'

export const dynamic = 'force-dynamic'

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AnalyticsPage(props: Props) {
    const searchParams = await props.searchParams
    const magazineId = typeof searchParams.magazineId === 'string' ? searchParams.magazineId : undefined
    const supabase = await createClient()

    // 0. Fetch Magazines for Dropdown
    const { data: magazines } = await supabase
        .from('magazines')
        .select('id, title, issue_number, is_published')
        .order('issue_number', { ascending: false })

    // Helper to build queries with conditional filter
    // Since we need to filter EVENTS based on SESSION data (magazine_id), 
    // we first get relevant session IDs if a filter is applied.

    // let sessionIds: string[] | null = null

    /*
    if (magazineId && magazineId !== 'all') {
        const { data: sessions } = await supabase
            .from('analytics_sessions')
            .select('id')
            .eq('magazine_id', magazineId)

        sessionIds = sessions?.map(s => s.id) || []
    }
    */

    // 1. Fetch Summary Stats
    // Total Views (Page Views)
    let viewsQuery = supabase
        .from('analytics_sessions')
        .select('*', { count: 'exact', head: true })

    if (magazineId && magazineId !== 'all') {
        viewsQuery = viewsQuery.eq('magazine_id', magazineId)
    }
    const { count: totalViews } = await viewsQuery

    // Unique Readers (Sessions)
    let readersQuery = supabase
        .from('analytics_sessions')
        .select('*', { count: 'exact', head: true })

    if (magazineId && magazineId !== 'all') {
        readersQuery = readersQuery.eq('magazine_id', magazineId)
    }
    const { count: uniqueReaders } = await readersQuery


    // 2. Fetch Daily Stats (Last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let dailyEventsQuery = supabase
        .from('analytics_sessions')
        .select('created_at:started_at') // Alias started_at as created_at for compatibility
        // .eq('event_type', 'page_view') // sessions table doesn't have event_type
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true })

    if (magazineId && magazineId !== 'all') {
        dailyEventsQuery = dailyEventsQuery.eq('magazine_id', magazineId)
    }

    const { data: recentEvents } = await dailyEventsQuery

    const dailyMap = new Map<string, number>()
    recentEvents?.forEach(ev => {
        const date = new Date(ev.created_at).toISOString().split('T')[0]
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
    })

    const dailyStats = []
    for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        dailyStats.push({
            date: dateStr,
            views: dailyMap.get(dateStr) || 0,
            unique_users: 0
        })
    }
    dailyStats.reverse()



    // 3. Removed Page Stats (Heatmap)


    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <AnalyticsDashboardClient
                dailyStats={dailyStats}
                summary={{
                    totalViews: totalViews || 0,
                    uniqueReaders: uniqueReaders || 0,
                    avgSessionDuration: 0
                }}
                magazines={magazines || []}
            />
        </div>
    )
}
