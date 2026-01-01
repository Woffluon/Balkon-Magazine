import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { AnalyticsFilters, DateRangePreset } from '@/types/analytics'
import { subDays, startOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns'

// Defaults
const DEFAULT_PRESET: DateRangePreset = '30d'

export function useAnalyticsFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Parse URL to State
    const filters = useMemo((): AnalyticsFilters => {
        const params = new URLSearchParams(searchParams.toString())

        // Date Parsing
        const preset = (params.get('preset') as DateRangePreset) || DEFAULT_PRESET
        const from = params.get('from') || undefined
        const to = params.get('to') || undefined

        // Array Parsing (Magazines)
        const magazineIds = params.getAll('magazineIds')

        // Number Parsing
        const minDurationSeconds = params.get('minDurationSeconds') ? Number(params.get('minDurationSeconds')) : undefined
        const minScrollDepth = params.get('minScrollDepth') ? Number(params.get('minScrollDepth')) as 25 | 50 | 75 | 100 : undefined

        // Boolean Parsing
        const isFinished = params.get('isFinished') === 'true' ? true : params.get('isFinished') === 'false' ? false : undefined

        // String Enums
        const readerType = params.get('readerType') as 'new' | 'returning' | undefined
        const deviceType = params.get('deviceType') as 'mobile' | 'tablet' | 'desktop' | undefined

        return {
            dateRange: { preset, from, to },
            magazineIds,
            minDurationSeconds,
            minScrollDepth,
            isFinished,
            readerType,
            deviceType
        }
    }, [searchParams])

    // Local state for debouncing if needed, but for now strict URL sync
    // We can add a 'staging' state in the UI components themselves for inputs like sliders

    const setFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
        const params = new URLSearchParams(searchParams.toString())

        // Helper to set/delete
        const updateParam = (key: string, value: string | undefined | null) => {
            if (value === undefined || value === null || value === '') {
                params.delete(key)
            } else {
                params.set(key, value)
            }
        }

        // 1. Date Range
        if (newFilters.dateRange) {
            updateParam('preset', newFilters.dateRange.preset)
            updateParam('from', newFilters.dateRange.from)
            updateParam('to', newFilters.dateRange.to)
        }

        // 2. Magazines (Special handling for arrays)
        if (newFilters.magazineIds !== undefined) {
            params.delete('magazineIds')
            newFilters.magazineIds.forEach(id => params.append('magazineIds', id))
        }

        // 3. Simple fields
        if (newFilters.minDurationSeconds !== undefined) updateParam('minDurationSeconds', String(newFilters.minDurationSeconds))
        if (newFilters.minScrollDepth !== undefined) updateParam('minScrollDepth', String(newFilters.minScrollDepth))
        if (newFilters.isFinished !== undefined) updateParam('isFinished', String(newFilters.isFinished))
        if (newFilters.readerType !== undefined) updateParam('readerType', newFilters.readerType)
        if (newFilters.deviceType !== undefined) updateParam('deviceType', newFilters.deviceType)

        // Push new URL
        router.push(`?${params.toString()}`, { scroll: false })
    }, [router, searchParams])

    // Utility to get Date objects from current filters (for API calls)
    const getDateRangeIso = useCallback(() => {
        const { preset, from, to } = filters.dateRange
        let start: Date
        let end: Date = endOfDay(new Date())

        if (preset === 'custom' && from && to) {
            start = new Date(from)
            end = new Date(to)
        } else {
            // Preset logic
            const now = new Date()
            switch (preset) {
                case 'today':
                    start = startOfDay(now)
                    break
                case '7d':
                    start = subDays(now, 7)
                    break
                case '30d': // Default
                    start = subDays(now, 30)
                    break
                case '90d':
                    start = subDays(now, 90)
                    break
                case 'this_month':
                    start = startOfMonth(now)
                    break
                case 'last_month':
                    start = startOfMonth(subMonths(now, 1))
                    end = subDays(startOfMonth(now), 1) // End of last month
                    break
                default:
                    start = subDays(now, 30)
            }
        }

        return {
            startIso: start.toISOString(),
            endIso: end.toISOString()
        }

    }, [filters.dateRange])

    return {
        filters,
        setFilters,
        getDateRangeIso
    }
}
