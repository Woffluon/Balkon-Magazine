import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/services/Logger'

const requestSchema = z.object({
  magazineId: z.string().min(1),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']),
  userAgent: z.string().min(1).max(512),
  startedAt: z.string().datetime(),
  lastActiveAt: z.string().datetime(),
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

    const { data, error } = await supabase
      .from('analytics_sessions')
      .insert({
        magazine_id: parsed.data.magazineId,
        device_type: parsed.data.deviceType,
        user_agent: parsed.data.userAgent,
        started_at: parsed.data.startedAt,
        last_active_at: parsed.data.lastActiveAt,
      })
      .select('id')
      .single()

    if (error) {
      logger.error('Failed to create analytics session', {
        operation: 'api.analytics.session.create',
        error,
      })
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id }, { status: 200 })
  } catch (error) {
    logger.error('Unhandled error in analytics session route', {
      operation: 'api.analytics.session.unhandled',
      error,
    })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
