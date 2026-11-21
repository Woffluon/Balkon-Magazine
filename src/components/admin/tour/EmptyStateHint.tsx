'use client'

import { useContext } from 'react'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { AdminTourContext, type TourPageKey } from '@/hooks/useAdminTour'
import { t } from '@/lib/i18n'

export interface EmptyStateHintProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  tourPage?: TourPageKey
  className?: string
}

/**
 * Contextual empty-state surface that pairs a clear next action with an optional
 * page mini-tour trigger when rendered inside `AdminTourProvider`.
 */
export function EmptyStateHint({
  title,
  description,
  actionLabel,
  onAction,
  tourPage,
  className,
}: EmptyStateHintProps) {
  const tour = useContext(AdminTourContext)
  const canStartTour = Boolean(tourPage && tour)

  return (
    <Empty
      icon={<Compass aria-hidden="true" />}
      title={title}
      description={description}
      className={className}
      action={
        actionLabel && onAction ? (
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : undefined
      }
    >
      {canStartTour && tourPage && tour ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => tour.startPageTour(tourPage)}
        >
          {t('tour.emptyHintCta')}
        </Button>
      ) : null}
    </Empty>
  )
}
