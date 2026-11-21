'use client'

import { useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Compass, Keyboard, Play, RotateCcw, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAdminTour } from '@/hooks/useAdminTour'
import { t } from '@/lib/i18n'
import {
  HELP_KEYBOARD_SHORTCUTS,
  filterHelpTopics,
  getHelpTopics,
} from '@/lib/tour/helpContent'
import { resolvePageKeyFromPathname } from '@/lib/tour/steps'

/**
 * Searchable Turkish help drawer accessible from the persistent admin header,
 * providing interactive tour triggers, task topics, and keyboard shortcuts.
 */
export function HelpDrawer() {
  const pathname = usePathname()
  const {
    isHelpDrawerOpen,
    closeHelpDrawer,
    startMainTour,
    restartTour,
    startPageTour,
    hasCompletedMainTour,
  } = useAdminTour()

  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const currentPageKey = resolvePageKeyFromPathname(pathname)
  const topics = useMemo(() => getHelpTopics(), [])
  const filteredTopics = useMemo(
    () => filterHelpTopics(topics, searchQuery),
    [topics, searchQuery]
  )

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery('')
      closeHelpDrawer()
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  return (
    <Dialog open={isHelpDrawerOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="top-0 right-0 bottom-0 left-auto flex h-full w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-r-0 bg-card p-0 text-card-foreground shadow-xl sm:max-w-md sm:rounded-l-xl data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=open]:duration-200 data-[state=closed]:duration-150 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none">
        <DialogHeader className="border-b border-border px-5 py-4 pr-14 text-left">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {t('tour.drawerTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('tour.drawerDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Tour Launch Actions */}
        <div className="flex flex-col gap-2 border-b border-border bg-muted/40 px-5 py-4 sm:flex-row">
          <Button
            type="button"
            variant="default"
            className="h-auto w-full whitespace-normal py-2 text-center sm:flex-1"
            onClick={hasCompletedMainTour ? restartTour : startMainTour}
          >
            {hasCompletedMainTour ? (
              <RotateCcw className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <Play className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span>
              {hasCompletedMainTour ? t('tour.restartLabel') : t('tour.startMainTour')}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-auto w-full whitespace-normal py-2 text-center sm:flex-1"
            onClick={() => startPageTour(currentPageKey)}
          >
            <Compass className="size-4 shrink-0" aria-hidden="true" />
            <span>{t('tour.startPageTour')}</span>
          </Button>
        </div>

        {/* Search Input */}
        <div className="border-b border-border px-5 py-3.5">
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('tour.drawerSearchPlaceholder')}
              aria-label={t('tour.drawerSearchPlaceholder')}
              className="bg-background pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClearSearch}
                aria-label={t('common.clear')}
                title={t('common.clear')}
                className="absolute right-1 size-8 min-h-8 min-w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>

        {/* Scrollable Help Topics and Keyboard Hints */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filteredTopics.length === 0 ? (
            <div
              role="status"
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center"
            >
              <p className="text-sm font-medium text-foreground">
                {t('tour.noTopicsFound')}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearSearch}
                className="mt-4"
              >
                {t('magazines.clearSearch')}
              </Button>
            </div>
          ) : (
            <ul className="space-y-3" aria-label={t('tour.drawerTitle')}>
              {filteredTopics.map((topic) => (
                <li
                  key={topic.id}
                  className="min-w-0 rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 break-words text-sm font-semibold text-foreground">
                      {topic.title}
                    </h3>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {topic.category}
                    </span>
                  </div>
                  <p className="mt-1.5 break-words text-sm leading-relaxed text-muted-foreground">
                    {topic.summary}
                  </p>
                  {topic.tourPage && topic.tourPage === currentPageKey ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startPageTour(topic.tourPage!)}
                        className="h-auto min-h-9 px-2.5 text-xs font-medium text-primary-text hover:text-primary-text"
                      >
                        <Compass className="size-3.5 shrink-0" aria-hidden="true" />
                        <span>{t('tour.emptyHintCta')}</span>
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {/* Keyboard Navigation Section */}
          <section
            aria-labelledby="help-keyboard-heading"
            className="mt-6 rounded-xl border border-border bg-muted/30 p-4"
          >
            <div className="flex items-center gap-2">
              <Keyboard className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <h3
                id="help-keyboard-heading"
                className="text-sm font-semibold text-foreground"
              >
                {t('tour.keyboardHeading')}
              </h3>
            </div>
            <dl className="mt-3 space-y-2.5">
              {HELP_KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.keys}
                  className="flex flex-col gap-1 text-xs sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
                >
                  <dt className="shrink-0">
                    <kbd className="inline-flex items-center rounded border border-input bg-card px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
                      {shortcut.keys}
                    </kbd>
                  </dt>
                  <dd className="min-w-0 text-muted-foreground sm:text-right">
                    {shortcut.description}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
