'use client'

import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { EmptyStateHint } from '@/components/admin/tour/EmptyStateHint'
import { t } from '@/lib/i18n'
import MagazineTable from './MagazineTable'
import type { Magazine } from '@/types/magazine'

const UploadDialog = dynamic(() => import('./UploadDialog'), {
  ssr: false,
  loading: () => (
    <Button disabled data-tour="upload-trigger" className="w-full sm:w-auto">
      <span>{t('common.loading')}</span>
    </Button>
  ),
})

interface AdminDashboardClientProps {
  magazines: Magazine[]
  userEmail?: string
}

export function AdminDashboardClient({ magazines }: AdminDashboardClientProps) {
  const hasItems = Boolean(magazines && magazines.length > 0)

  return (
    <div className="responsive-container py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>

        <div className="shrink-0">
          <UploadDialog />
        </div>
      </div>

      {!hasItems ? (
        <EmptyStateHint
          title={t('dashboard.emptyTitle')}
          description={t('dashboard.emptyDescription')}
          tourPage="upload"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
          <MagazineTable magazines={magazines} />
        </div>
      )}
    </div>
  )
}
