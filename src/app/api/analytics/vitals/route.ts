import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'
import { logger } from '@/lib/services/Logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, name, value, path, userAgent, timestamp } = body

    if (!name || value === undefined) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = createPublicClient()
    const { error } = await supabase
      .from('performance_metrics')
      .insert({
        metric_id: id || 'unknown',
        name,
        value: parseFloat(value),
        path: path || '/',
        user_agent: userAgent || '',
        created_at: new Date(timestamp || Date.now()).toISOString()
      })

    if (error) {
      // Don't fail the request if database is missing this table, just log it.
      // Helps during initial deployment before migrations run.
      logger.error('Failed to save performance metrics to Supabase', {
        component: 'vitals-route',
        error: error.message
      })
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error handling performance metrics POST request', {
      component: 'vitals-route',
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
