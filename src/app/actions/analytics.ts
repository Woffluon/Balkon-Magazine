'use server'

import { analyticsService } from '@/lib/services/AnalyticsService'
import { AnalyticsFilters } from '@/types/analytics'

export async function fetchAnalyticsData(filters: AnalyticsFilters) {
    // Convert Filters to the format AnalyticsService expects
    // The service expects { magazineIds, dateRange: { startIso, endIso }, ... }

    // We need to resolve the date range here or in the service. 
    // The hook 'useAnalyticsFilters' has a helper 'getDateRangeIso'.
    // But we are on the server, we get the RAW filters from the client.
    // We need to re-calculate ISO strings if they are missing or just pass the filters.
    // Wait, the client hook calculates ISOs. We should pass those.

    // Actually, let's keep it simple. The client hook exports 'getDateRangeIso'.
    // We can pass the resolved ISO strings to the action.

    // But for 'preset', the server should arguably calculate "Today" to ensure server time matches? 
    // User requirement: "Timezone Awareness".
    // If I calculate "Today" on server, it uses Server Time (UTC probably).
    // If I calculate on Client, it uses User Time.
    // Usually for "My Analytics", User Time is preferred.
    // So Client resolves "Today" -> "2023-10-27T00:00:00+03:00".
    // Helper logic should be passed.

    return await analyticsService.getAnalyticsData(filters)
}
