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

    private async postJson<T>(url: string, body: unknown): Promise<T> {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            let details: unknown = null
            try {
                details = await res.json()
            } catch {
                // ignore
            }
            throw new Error(`Request failed: ${res.status} ${res.statusText}${details ? ` - ${JSON.stringify(details)}` : ''}`)
        }

        return (await res.json()) as T
    }

    constructor() {
        if (typeof window !== 'undefined') {
            this.startFlushInterval()
            window.addEventListener('beforeunload', () => this.flushInternal())
        }
    }

    public async startSession(magazineId: string): Promise<string> {
        try {
            const userAgent = navigator.userAgent
            const deviceType = /Mobi|Android/i.test(userAgent) ? 'mobile' : /Tablet|iPad/i.test(userAgent) ? 'tablet' : 'desktop'

            const now = new Date().toISOString()
            const data = await this.postJson<{ id: string }>('/api/analytics/session', {
                magazineId,
                deviceType,
                userAgent,
                startedAt: now,
                lastActiveAt: now,
            })

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
            const payload = {
                events: eventsToSend.map((e) => ({
                    sessionId: e.session_id,
                    eventType: e.event_type,
                    metadata: e.metadata,
                })),
                lastActiveAt: new Date().toISOString(),
            }

            await this.postJson<{ ok: true }>('/api/analytics/events', payload)
        } catch (err) {
            logger.warn('Failed to flush analytics queue, retrying later', { count: eventsToSend.length, error: err })

            // Simple retry strategy: re-push only if queue isn't huge
            if (this.queue.length < 100) {
                this.queue = [...eventsToSend, ...this.queue]
            }
        }
    }
}

export const analyticsService = new AnalyticsService()

