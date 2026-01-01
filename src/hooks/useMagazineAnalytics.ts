import { useEffect, useRef } from 'react'
import { analyticsService } from '@/lib/services/AnalyticsService'

export function useMagazineAnalytics(magazineId: string) {
    const sessionInitializedRef = useRef<string | null>(null)
    const maxScrollDepthRef = useRef<number>(0)

    // Initialize Session
    useEffect(() => {
        // Prevent double initialization
        if (sessionInitializedRef.current === magazineId) return
        sessionInitializedRef.current = magazineId

        analyticsService.startSession(magazineId)
    }, [magazineId])

    // Track Visibility & Heartbeat
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                analyticsService.trackEvent('interaction', { metadata: { type: 'resume' } })
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    // Track Scroll Depth
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY
            const docHeight = document.documentElement.scrollHeight - window.innerHeight
            const scrollPercent = (scrollTop / docHeight) * 100

            const milestones = [25, 50, 75, 100]

            milestones.forEach(milestone => {
                if (scrollPercent >= milestone && maxScrollDepthRef.current < milestone) {
                    maxScrollDepthRef.current = milestone
                    analyticsService.trackEvent('interaction', {
                        metadata: {
                            type: 'scroll_milestone',
                            depth: milestone
                        }
                    })
                }
            })
        }

        // Debounce scroll handler
        let timeoutId: NodeJS.Timeout
        const debouncedScroll = () => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(handleScroll, 200)
        }

        window.addEventListener('scroll', debouncedScroll)
        return () => window.removeEventListener('scroll', debouncedScroll)
    }, [])
}
