import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/services/Logger'

const eventSchema = z.object({
  sessionId: z.string().uuid(),
  eventType: z.literal('interaction'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const requestSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
  lastActiveAt: z.string().datetime().optional(),
})

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null)
    const parsed = requestSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const eventsToInsert = parsed.data.events.map((e) => ({
      session_id: e.sessionId,
      event_type: e.eventType,
      metadata: e.metadata ?? null,
    }))

    const { error: insertError } = await supabase
      .from('analytics_events')
      .insert(eventsToInsert)

    if (insertError) {
      logger.warn('Failed to insert analytics events', {
        operation: 'api.analytics.events.insert',
        error: insertError,
        count: eventsToInsert.length,
      })

      return NextResponse.json({ error: 'Failed to insert events' }, { status: 500 })
    }

    if (parsed.data.lastActiveAt) {
      const sessionId = eventsToInsert[0]?.session_id
      if (sessionId) {
        const { error: updateError } = await supabase
          .from('analytics_sessions')
          .update({ last_active_at: parsed.data.lastActiveAt })
          .eq('id', sessionId)

        if (updateError) {
          logger.warn('Failed to update analytics session last_active_at', {
            operation: 'api.analytics.sessions.heartbeat',
            error: updateError,
            sessionId,
          })
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    logger.error('Unhandled error in analytics events route', {
      operation: 'api.analytics.events.unhandled',
      error,
    })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
