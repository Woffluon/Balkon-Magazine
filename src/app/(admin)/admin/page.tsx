import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorHandler, type Result } from '@/lib/errors/errorHandler'
import { t } from '@/lib/i18n'
import { SupabaseMagazineRepository } from '@/lib/repositories/SupabaseMagazineRepository'
import { requireAdmin } from '@/lib/services/authorization'
import { logger } from '@/lib/services/Logger'
import { getAuthenticatedClient } from '@/lib/supabase/server'
import type { Magazine } from '@/types/magazine'
import { AdminDashboardClient } from './AdminDashboardClient'

export const metadata: Metadata = {
  title: `${t('dashboard.title')} - Balkon Dergisi`,
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminDashboard() {
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
  const magazineRepository = new SupabaseMagazineRepository(supabase)

  let result: Result<Magazine[]>

  try {
    const magazines = await magazineRepository.findAll()
    result = ErrorHandler.success(magazines)
  } catch (error) {
    const appError = ErrorHandler.handleUnknownError(error)
    logger.error('Failed to fetch magazines in admin page', {
      page: 'admin/page',
      operation: 'findAll',
      userId: authContext.userId,
      userEmail,
      error: {
        code: appError.code,
        message: appError.message,
        stack: appError.stack,
      },
    })

    result = ErrorHandler.failure(appError)
  }

  if (!result.success) {
    return (
      <div className="responsive-container py-6 sm:py-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>

        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-2xl border border-status-error-border bg-status-error-bg p-8 text-center text-status-error-fg sm:p-10"
        >
          <AlertCircle className="mb-3 size-8 shrink-0" aria-hidden="true" />
          <h2 className="mb-2 text-lg font-semibold">{result.error.userMessage}</h2>
          <p className="mb-6 max-w-md text-sm opacity-90">
            {t('errors.retryHint')}
          </p>
          <Button asChild variant="default">
            <Link href="/admin">{t('common.refreshPage')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return <AdminDashboardClient magazines={result.data} userEmail={userEmail} />
}
