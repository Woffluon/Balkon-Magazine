import { useEffect, useRef } from 'react'
import { analyticsService } from '@/lib/services/AnalyticsService'



export function useMagazineAnalytics(magazineId: string) {
    const isTabActiveRef = useRef<boolean>(true)
    const sessionInitializedRef = useRef<string | null>(null)

    // Initialize Session
    useEffect(() => {
        // Prevent double initialization in Strict Mode (dev)
        if (sessionInitializedRef.current === magazineId) return
        sessionInitializedRef.current = magazineId

        analyticsService.startSession(magazineId)
    }, [magazineId])

    // Track Tab Visibility/Activity (just to update last_active_at implicitly via occasional events if we had them, 
    // but for now we might just want to ping heartbeats or keep it simple.
    // Since we removed page tracking, the only way 'last_active_at' updates is on flush.
    // Without events, we might not be flushing much.
    // For now, let's just keep the session start.
    // If we want to track "Duration", we'd need a heartbeat event 'interaction'.

    // Let's add a simple heartbeat every minute? Or just on visibility change?

    useEffect(() => {
        const handleVisibilityChange = () => {
            const isVisible = document.visibilityState === 'visible'
            if (isVisible) {
                // User came back
                analyticsService.trackEvent('interaction', { metadata: { type: 'resume' } })
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])
}
