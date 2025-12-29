import { createClient } from '@/lib/supabase/client'
import { logger } from './Logger'
import { v4 as uuidv4 } from 'uuid'

// Types
export interface AnalyticsSession {
    id?: string
    magazine_id: string
    device_type: 'mobile' | 'tablet' | 'desktop'
    user_agent: string
}

export interface AnalyticsEvent {
    session_id: string
    event_type: 'interaction'
    metadata?: Record<string, unknown>
}

class AnalyticsService {
    private queue: AnalyticsEvent[] = []
    private batchSize = 5
    private flushInterval = 10000 // 10 seconds
    private intervalId: NodeJS.Timeout | null = null
    private currentSessionId: string | null = null

    constructor() {
        if (typeof window !== 'undefined') {
            this.startFlushInterval()
            window.addEventListener('beforeunload', () => this.flushInternal())
        }
    }

    public async startSession(magazineId: string): Promise<string> {
        try {
            const supabase = createClient()
            const userAgent = navigator.userAgent
            const deviceType = /Mobi|Android/i.test(userAgent) ? 'mobile' : /Tablet|iPad/i.test(userAgent) ? 'tablet' : 'desktop'

            const { data, error } = await supabase
                .from('analytics_sessions')
                .insert({
                    magazine_id: magazineId,
                    device_type: deviceType,
                    user_agent: userAgent,
                    started_at: new Date().toISOString(),
                    last_active_at: new Date().toISOString()
                })
                .select('id')
                .single()

            if (error) throw error

            this.currentSessionId = data.id
            logger.info('Analytics session started', { sessionId: this.currentSessionId })
            return data.id
        } catch (error) {
            logger.error('Failed to start analytics session', { error })
            // Fallback ID to allow local tracking even if DB fail (won't sync but won't crash)
            const fallbackId = uuidv4()
            this.currentSessionId = fallbackId
            return fallbackId
        }
    }

    public trackEvent(eventType: 'interaction', data: { metadata?: Record<string, unknown> } = {}) {
        if (!this.currentSessionId) return

        this.queue.push({
            session_id: this.currentSessionId,
            event_type: eventType,
            metadata: data.metadata
        })

        if (this.queue.length >= this.batchSize) {
            this.flushInternal()
        }
    }

    private startFlushInterval() {
        this.intervalId = setInterval(() => {
            if (this.queue.length > 0) this.flushInternal()
        }, this.flushInterval)
    }

    private async flushInternal() {
        if (this.queue.length === 0) return

        const eventsToSend = [...this.queue]
        this.queue = []

        try {
            const supabase = createClient()
            const { error } = await supabase.from('analytics_events').insert(eventsToSend)

            if (error) {
                // If fail, put back in front of queue (be careful of unlimited growth, maybe limit retries)
                logger.warn('Failed to flush analytics queue, retrying later', { count: eventsToSend.length, error })
                // Simple retry strategy: re-push only if queue isn't huge
                if (this.queue.length < 100) {
                    this.queue = [...eventsToSend, ...this.queue]
                }
            } else {
                // Also update last_active_at for the session
                if (this.currentSessionId) {
                    await supabase
                        .from('analytics_sessions')
                        .update({ last_active_at: new Date().toISOString() })
                        .eq('id', this.currentSessionId)
                }
            }
        } catch (err) {
            logger.error('Error flushing analytics events', { err })
        }
    }
}

export const analyticsService = new AnalyticsService()
