import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAnalyticsDashboardData } from '@/app/actions/analytics-actions'
import { DynamicAnalyticsDashboard } from '@/lib/dynamic-imports'
import { t } from '@/lib/i18n'
import { requireAdmin } from '@/lib/services/authorization'
import { logger } from '@/lib/services/Logger'
import { getAuthenticatedClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: `${t('analytics.title')} - Balkon Dergisi`,
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AnalyticsPage() {
  let authContext: Awaited<ReturnType<typeof requireAdmin>>

  try {
    authContext = await requireAdmin()
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthorizationError') {
      redirect('/admin/login')
    }
    throw error
  }

  const supabase = await getAuthenticatedClient()
  const userEmail = authContext.userEmail

  const { data: magazines } = await supabase
    .from('magazines')
    .select('id, title, issue_number')
    .order('issue_number', { ascending: false })

  const result = await getAnalyticsDashboardData(30)

  if (!result.success) {
    if (result.error.code !== 'UNAUTHORIZED') {
      logger.error('Failed to fetch analytics data in admin page', {
        page: 'admin/analytics/page',
        userId: authContext.userId,
        userEmail,
        error: result.error,
      })
    }

    return (
      <div className="responsive-container py-6 sm:py-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('analytics.title')}
          </h1>
        </div>

        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-2xl border border-status-error-border bg-status-error-bg p-8 text-center text-status-error-fg sm:p-10"
        >
          <AlertCircle className="mb-3 size-8 shrink-0" aria-hidden="true" />
          <h2 className="mb-2 text-lg font-semibold">
            {result.error.userMessage || t('errors.analyticsLoadFailed')}
          </h2>
          <p className="mb-6 max-w-md text-sm opacity-90">
            {t('errors.analyticsLoadFailed')}
          </p>
          <Button asChild variant="default">
            <Link href="/admin/analytics">{t('common.refreshPage')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <DynamicAnalyticsDashboard
      initialData={result.data}
      userEmail={userEmail}
      magazines={magazines || []}
    />
  )
}
