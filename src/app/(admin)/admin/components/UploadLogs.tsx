'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, Info, Loader2 } from 'lucide-react'
import { formatNumberTR, formatTimeTR } from '@/lib/formatters/tr'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { UploadLogEntry, UploadLogType } from '@/hooks/useUploadProgress'

interface UploadLogsProps {
  logs: UploadLogEntry[]
  hasError?: boolean
  busy?: boolean
}

function LogIcon({ type }: { type: UploadLogType }) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-success-fg" aria-hidden="true" />
    case 'error':
      return <AlertCircle className="mt-0.5 size-4 shrink-0 text-status-error-fg" aria-hidden="true" />
    case 'progress':
      return <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-status-info-fg motion-reduce:animate-none" aria-hidden="true" />
    default:
      return <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  }
}

export function UploadLogs({ logs, hasError = false, busy = false }: UploadLogsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const effectiveOpen = isOpen || hasError || busy

  useEffect(() => {
    if (effectiveOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs.length, effectiveOpen])

  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={effectiveOpen}
        aria-controls={panelId}
        className="flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-1 text-left text-xs font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-sm"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span>{t('upload.logsTitle')}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {formatNumberTR(logs.length)}
          </span>
          {!effectiveOpen && latestLog ? (
            <span className="hidden truncate text-xs font-normal text-muted-foreground sm:inline">
              · {latestLog.message}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out motion-reduce:transition-none',
            effectiveOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {effectiveOpen ? (
        <div
          id="upload-logs"
          role="region"
          aria-labelledby={panelId}
          aria-live="polite"
          className="h-36 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 sm:h-44"
        >
          <span id={panelId} className="sr-only">
            {t('upload.logsTitle')}
          </span>
          {logs.length === 0 ? (
            <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
              <Info className="size-4 shrink-0" aria-hidden="true" />
              <span>{t('upload.logsEmpty')}</span>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    'flex items-start gap-2.5 rounded-md border p-2.5',
                    log.type === 'error'
                      ? 'border-status-error-border bg-status-error-bg text-status-error-fg'
                      : log.type === 'success'
                        ? 'border-status-success-border bg-status-success-bg text-status-success-fg'
                        : log.type === 'progress'
                          ? 'border-status-info-border bg-status-info-bg text-status-info-fg'
                          : 'border-border bg-card text-foreground'
                  )}
                >
                  <LogIcon type={log.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed font-medium break-words">
                      {log.message}
                    </p>
                    <p className="mt-0.5 text-xs opacity-80 tabular-nums">
                      {formatTimeTR(log.timestamp, true)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
