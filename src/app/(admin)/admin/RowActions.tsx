'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertTriangle, Loader2, MoreHorizontal, Pencil, Trash2, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteMagazine, renameMagazine } from './actions'
import { handleServerActionResult } from '@/lib/utils/resultValidation'
import { formatErrorWithContext, type FormattedError } from '@/lib/utils/errorMessages'
import { TURKISH_TITLE_REGEX } from '@/lib/validators/schemas'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface RowActionsProps {
  id: string
  issue: number
  title: string
  version: number
  isTourTarget?: boolean
  fullWidthTrigger?: boolean
}

export function RowActions({
  id,
  issue,
  title,
  version,
  isTourTarget = false,
  fullWidthTrigger = false,
}: RowActionsProps) {
  const [openRename, setOpenRename] = useState(false)
  const [newIssue, setNewIssue] = useState<number | ''>(issue)
  const [newTitle, setNewTitle] = useState(title)
  const [openDelete, setOpenDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [renameError, setRenameError] = useState<FormattedError | null>(null)
  const [deleteError, setDeleteError] = useState<FormattedError | null>(null)
  const router = useRouter()

  const issueInputId = useId()
  const titleInputId = useId()

  const handleOpenRename = () => {
    setNewIssue(issue)
    setNewTitle(title)
    setRenameError(null)
    setOpenRename(true)
  }

  const handleOpenDelete = () => {
    setDeleteError(null)
    setOpenDelete(true)
  }

  const handleRenameSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setRenameError(null)

    if (newIssue === '' || !Number.isInteger(newIssue) || newIssue < 1 || newIssue > 9999) {
      setRenameError({
        message: t('validation.issueRange'),
        type: 'VALIDATION',
        retryable: false,
      })
      return
    }

    const trimmedTitle = newTitle.trim()
    if (trimmedTitle.length > 0) {
      if (trimmedTitle.length > 200) {
        setRenameError({
          message: t('validation.titleMax'),
          type: 'VALIDATION',
          retryable: false,
        })
        return
      }
      if (!TURKISH_TITLE_REGEX.test(trimmedTitle)) {
        setRenameError({
          message: t('validation.titleCharset'),
          type: 'VALIDATION',
          retryable: false,
        })
        return
      }
    }

    const formData = new FormData()
    formData.set('id', id)
    formData.set('old_issue', String(issue))
    formData.set('version', String(version))
    formData.set('new_issue', String(newIssue))
    formData.set('new_title', trimmedTitle)

    startTransition(async () => {
      await handleServerActionResult(
        await renameMagazine(formData),
        z.void(),
        {
          onSuccess: () => {
            setOpenRename(false)
            setRenameError(null)
            toast.success(t('magazines.renameSuccess'))
            router.refresh()
          },
          onError: (error) => {
            const formattedError = formatErrorWithContext(error)
            setRenameError(formattedError)
          },
        },
        { operation: 'renameMagazine', magazineId: id, oldIssue: issue, newIssue }
      )
    })
  }

  const handleDeleteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setDeleteError(null)

    const formData = new FormData()
    formData.set('id', id)
    formData.set('issue_number', String(issue))

    startTransition(async () => {
      await handleServerActionResult(
        await deleteMagazine(formData),
        z.void(),
        {
          onSuccess: () => {
            setOpenDelete(false)
            setDeleteError(null)
            toast.success(t('magazines.deleteSuccess'))
            router.refresh()
          },
          onError: (error) => {
            const formattedError = formatErrorWithContext(error)
            setDeleteError(formattedError)
          },
        },
        { operation: 'deleteMagazine', magazineId: id, issueNumber: issue }
      )
    })
  }

  const renderErrorBanner = (err: FormattedError, isDelete = false) => {
    const isConflict = err.type === 'CONFLICT'
    const isNetwork = err.type === 'NETWORK'

    return (
      <div
        role="alert"
        className={cn(
          'rounded-lg border p-3 text-sm',
          isConflict
            ? 'border-status-warning-border bg-status-warning-bg text-status-warning-fg'
            : isNetwork
              ? 'border-status-info-border bg-status-info-bg text-status-info-fg'
              : 'border-status-error-border bg-status-error-bg text-status-error-fg'
        )}
      >
        <div className="flex items-start gap-2.5">
          {isConflict ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : isNetwork ? (
            <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="font-medium">{err.message}</p>

            {err.fields && err.fields.length > 0 ? (
              <ul className="space-y-1 text-xs">
                {err.fields.map((field, idx) => (
                  <li key={`${field.field}-${idx}`}>
                    • <span className="font-semibold">{field.field}:</span> {field.message}
                  </li>
                ))}
              </ul>
            ) : null}

            {isDelete && err.context && 'cleanup' in err.context && Boolean(err.context.cleanup) ? (
              <p className="text-xs font-medium">{t('errors.cleanupWarning')}</p>
            ) : null}

            {err.retryable ? (
              <p className="text-xs opacity-90">{t('errors.retryHint')}</p>
            ) : null}

            {isConflict ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
                className="mt-1"
              >
                {t('common.refreshPage')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-tour={isTourTarget ? 'row-actions' : undefined}
            aria-label={`${t('magazines.actionsLabel')} — ${t('magazines.colIssue')} ${issue}`}
            className={cn(
              'min-h-9 min-w-9 gap-1.5',
              fullWidthTrigger && 'min-h-10 w-full justify-center'
            )}
          >
            <MoreHorizontal className="size-4 shrink-0" aria-hidden="true" />
            <span className={cn(fullWidthTrigger ? 'inline' : 'hidden md:inline')}>
              {t('magazines.actionsLabel')}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            {t('magazines.colIssue')} {issue}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleOpenRename} className="min-h-9 cursor-pointer">
            <Pencil className="size-4" aria-hidden="true" />
            <span>{t('magazines.rename')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={handleOpenDelete}
            variant="destructive"
            className="min-h-9 cursor-pointer"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            <span>{t('magazines.delete')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog (controlled outside DropdownMenu) */}
      <Dialog
        open={openRename}
        onOpenChange={(nextOpen) => {
          if (!isPending) {
            setOpenRename(nextOpen)
            if (!nextOpen) {
              setRenameError(null)
            }
          }
        }}
      >
        <DialogContent className="mx-auto w-[94vw] max-w-md">
          <DialogHeader>
            <DialogTitle>{t('magazines.renameTitle')}</DialogTitle>
            <DialogDescription>
              {t('magazines.colIssue')} {issue} · {title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor={issueInputId}>{t('magazines.newIssueLabel')}</Label>
              <Input
                id={issueInputId}
                name="new_issue"
                type="number"
                min={1}
                max={9999}
                step={1}
                value={newIssue}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') {
                    setNewIssue('')
                    return
                  }
                  const parsed = Number(raw)
                  if (!Number.isNaN(parsed)) {
                    setNewIssue(parsed)
                  }
                }}
                required
                disabled={isPending}
                className="tabular-nums"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={titleInputId}>{t('magazines.newTitleLabel')}</Label>
              <Input
                id={titleInputId}
                name="new_title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={isPending}
              />
            </div>

            {renameError ? renderErrorBanner(renameError) : null}

            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenRename(false)}
                disabled={isPending}
                className="order-2 w-full sm:order-1 sm:w-auto"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={isPending}
                aria-busy={isPending}
                className="order-1 w-full sm:order-2 sm:w-auto"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    <span>{t('common.saving')}</span>
                  </>
                ) : (
                  t('common.save')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog (controlled outside DropdownMenu) */}
      <Dialog
        open={openDelete}
        onOpenChange={(nextOpen) => {
          if (!isPending) {
            setOpenDelete(nextOpen)
            if (!nextOpen) {
              setDeleteError(null)
            }
          }
        }}
      >
        <DialogContent className="mx-auto w-[94vw] max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('magazines.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('magazines.deleteWarning', { issue, title })}{' '}
              {t('magazines.deleteIrreversible')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteSubmit} className="space-y-4">
            {deleteError ? renderErrorBanner(deleteError, true) : null}

            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenDelete(false)}
                disabled={isPending}
                className="order-2 w-full sm:order-1 sm:w-auto"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isPending}
                aria-busy={isPending}
                className="order-1 w-full sm:order-2 sm:w-auto"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    <span>{t('common.deleting')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" aria-hidden="true" />
                    <span>{t('magazines.confirmDelete')}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
