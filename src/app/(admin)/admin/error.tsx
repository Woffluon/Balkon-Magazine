'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/services/Logger'
import { env } from '@/lib/config/env'
import { t } from '@/lib/i18n'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isDevelopment = env.NODE_ENV === 'development'

  useEffect(() => {
    logger.error('Admin error boundary caught error', {
      message: error.message,
      name: error.name,
      digest: error.digest,
      stack: error.stack,
      boundary: 'admin',
      section: 'admin-dashboard',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    })
  }, [error])

  return (
    <div className="responsive-container py-8 sm:py-12">
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="mx-auto max-w-2xl rounded-2xl border border-status-error-border bg-card px-6 py-8 text-card-foreground shadow-sm sm:px-8 sm:py-10"
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-status-error-border bg-status-error-bg text-status-error-fg">
            <AlertCircle className="size-7" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {t('errors.adminBoundaryTitle')}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {isDevelopment ? error.message : t('errors.unknown')}
            </p>
            {error.digest ? (
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                {error.digest}
              </p>
            ) : null}
          </div>

          {isDevelopment && error.stack ? (
            <details className="w-full rounded-lg border border-border bg-muted/40 p-3 text-left">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Teknik Detaylar (Geliştirme Modu)
              </summary>
              <pre className="mt-2 overflow-x-auto text-xs break-words whitespace-pre-wrap text-muted-foreground">
                {error.stack}
              </pre>
            </details>
          ) : null}

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button type="button" variant="default" onClick={() => reset()}>
              {t('common.retry')}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">{t('errors.adminBoundaryReturn')}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">{t('common.backToHome')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
