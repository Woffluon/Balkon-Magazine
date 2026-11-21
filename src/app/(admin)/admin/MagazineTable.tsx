'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  compareTR,
  formatDateTR,
  formatNumberTR,
  normalizeSearchTR,
  parseLocalDateTR,
} from '@/lib/formatters/tr'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { RowActions } from './RowActions'
import type { Magazine } from '@/types/magazine'

type Props = {
  magazines: Magazine[]
}

type SortKey = 'issue_number' | 'title' | 'publication_date'
type StatusFilter = 'all' | 'published' | 'draft'
type DensityMode = 'comfortable' | 'compact'

export default function MagazineTable({ magazines }: Props) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [density, setDensity] = useState<DensityMode>('comfortable')
  const [sortKey, setSortKey] = useState<SortKey>('issue_number')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const media = window.matchMedia('(min-width: 640px)')
    const syncViewport = () => setIsDesktop(media.matches)
    syncViewport()
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearchTR(query)
    const base = magazines.filter((mag) => {
      if (statusFilter === 'published' && !mag.is_published) return false
      if (statusFilter === 'draft' && mag.is_published) return false
      if (!normalizedQuery) return true

      const issueText = normalizeSearchTR(String(mag.issue_number))
      const titleText = normalizeSearchTR(mag.title || '')
      return issueText.includes(normalizedQuery) || titleText.includes(normalizedQuery)
    })

    return [...base].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'issue_number') {
        return (a.issue_number - b.issue_number) * dir
      }
      if (sortKey === 'title') {
        return compareTR(a.title || '', b.title || '') * dir
      }
      const aDate = parseLocalDateTR(a.publication_date)?.getTime() ?? 0
      const bDate = parseLocalDateTR(b.publication_date)?.getTime() ?? 0
      return (aDate - bDate) * dir
    })
  }, [magazines, query, statusFilter, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function clearSearchAndFocus() {
    setQuery('')
    setStatusFilter('all')
    searchInputRef.current?.focus()
  }

  function getAriaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (sortKey !== key) return 'none'
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  function renderSortIcon(key: SortKey) {
    if (sortKey !== key) {
      return <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="size-3.5 text-primary" aria-hidden="true" />
    ) : (
      <ArrowDown className="size-3.5 text-primary" aria-hidden="true" />
    )
  }

  const hasActiveFilter = query.trim().length > 0 || statusFilter !== 'all'
  const cellPaddingClass = density === 'compact' ? 'py-2' : 'py-3.5'
  const cardPaddingClass = density === 'compact' ? 'p-3' : 'p-4'

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Search, Filter, Density & Count Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:flex-wrap">
          <div data-tour="magazine-search" className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder={t('magazines.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('magazines.searchAria')}
              className="pr-10 pl-9"
            />
            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  searchInputRef.current?.focus()
                }}
                aria-label={t('magazines.clearSearch')}
                className="absolute top-1/2 right-0.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger
              aria-label={t('magazines.statusFilterLabel')}
              className="w-full sm:w-44"
            >
              <SelectValue placeholder={t('magazines.statusFilterLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('magazines.statusAll')}</SelectItem>
              <SelectItem value="published">{t('magazines.statusPublished')}</SelectItem>
              <SelectItem value="draft">{t('magazines.statusDraft')}</SelectItem>
            </SelectContent>
          </Select>

          <div
            role="group"
            aria-label={t('magazines.densityLabel')}
            className="inline-flex w-full items-center rounded-md border border-input bg-background p-0.5 sm:w-auto"
          >
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              aria-pressed={density === 'comfortable'}
              className={cn(
                'inline-flex min-h-9 flex-1 items-center justify-center rounded-sm px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 sm:flex-initial',
                density === 'comfortable'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('magazines.densityComfortable')}
            </button>
            <button
              type="button"
              onClick={() => setDensity('compact')}
              aria-pressed={density === 'compact'}
              className={cn(
                'inline-flex min-h-9 flex-1 items-center justify-center rounded-sm px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 sm:flex-initial',
                density === 'compact'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('magazines.densityCompact')}
            </button>
          </div>
        </div>

        <div className="text-xs font-medium text-muted-foreground tabular-nums sm:text-sm">
          {hasActiveFilter
            ? t('dashboard.filteredCount', {
                filtered: formatNumberTR(filtered.length),
                total: formatNumberTR(magazines.length),
              })
            : t('dashboard.totalCount', {
                count: formatNumberTR(magazines.length),
              })}
        </div>
      </div>

      {/* Zero Results State (table hidden per IBM Carbon pattern) */}
      {filtered.length === 0 ? (
        <Empty
          icon={<Search />}
          title={t('magazines.noResultsTitle')}
          description={t('magazines.noResultsDescription')}
          action={
            <Button type="button" variant="outline" onClick={clearSearchAndFocus}>
              {t('magazines.clearSearch')}
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile Card List (< 640px, zero horizontal overflow) */}
          <div
            data-tour={isDesktop === false ? 'magazine-table' : undefined}
            className="space-y-3 sm:hidden"
          >
            {filtered.map((mag, index) => (
              <article
                key={String(mag.id)}
                className={cn(
                  'rounded-xl border border-border bg-card text-card-foreground shadow-xs',
                  cardPaddingClass
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {t('magazines.colIssue')} {formatNumberTR(mag.issue_number)}
                  </span>
                  <Badge variant={mag.is_published ? 'success' : 'warning'}>
                    {mag.is_published ? t('magazines.statusPublished') : t('magazines.statusDraft')}
                  </Badge>
                </div>

                <h3 className="mt-1.5 text-sm font-medium break-words text-foreground">
                  {mag.title}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  <span>{formatDateTR(mag.publication_date)}</span>
                  {typeof mag.page_count === 'number' && mag.page_count > 0 ? (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>
                        {t('magazines.pageCount', { count: formatNumberTR(mag.page_count) })}
                      </span>
                    </>
                  ) : null}
                </div>

                <div className="mt-3">
                  <RowActions
                    id={String(mag.id)}
                    issue={mag.issue_number}
                    title={mag.title}
                    version={mag.version}
                    fullWidthTrigger
                    isTourTarget={index === 0 && isDesktop === false}
                  />
                </div>
              </article>
            ))}
          </div>

          {/* Desktop & Tablet Data Table (>= 640px) */}
          <div
            data-tour={isDesktop !== false ? 'magazine-table' : undefined}
            className="hidden overflow-x-auto sm:block"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead aria-sort={getAriaSort('issue_number')} className="whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('issue_number')}
                      aria-label={
                        sortKey === 'issue_number'
                          ? `${t('magazines.sortIssueAria')} (${
                              sortDir === 'asc'
                                ? t('magazines.sortDirectionAsc')
                                : t('magazines.sortDirectionDesc')
                            })`
                          : t('magazines.sortIssueAria')
                      }
                      className="-ml-2 h-9 px-2 font-semibold text-foreground"
                    >
                      <span>{t('magazines.colIssue')}</span>
                      {renderSortIcon('issue_number')}
                    </Button>
                  </TableHead>
                  <TableHead aria-sort={getAriaSort('title')} className="whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('title')}
                      aria-label={
                        sortKey === 'title'
                          ? `${t('magazines.sortTitleAria')} (${
                              sortDir === 'asc'
                                ? t('magazines.sortDirectionAsc')
                                : t('magazines.sortDirectionDesc')
                            })`
                          : t('magazines.sortTitleAria')
                      }
                      className="-ml-2 h-9 px-2 font-semibold text-foreground"
                    >
                      <span>{t('magazines.colTitle')}</span>
                      {renderSortIcon('title')}
                    </Button>
                  </TableHead>
                  <TableHead aria-sort={getAriaSort('publication_date')} className="whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('publication_date')}
                      aria-label={
                        sortKey === 'publication_date'
                          ? `${t('magazines.sortDateAria')} (${
                              sortDir === 'asc'
                                ? t('magazines.sortDirectionAsc')
                                : t('magazines.sortDirectionDesc')
                            })`
                          : t('magazines.sortDateAria')
                      }
                      className="-ml-2 h-9 px-2 font-semibold text-foreground"
                    >
                      <span>{t('magazines.colDate')}</span>
                      {renderSortIcon('publication_date')}
                    </Button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-semibold text-foreground">
                    {t('magazines.colPages')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-semibold text-foreground">
                    {t('magazines.colStatus')}
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold text-foreground">
                    {t('magazines.colActions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((mag, index) => (
                  <TableRow key={String(mag.id)}>
                    <TableCell
                      className={cn(
                        'font-medium whitespace-nowrap text-foreground tabular-nums',
                        cellPaddingClass
                      )}
                    >
                      {formatNumberTR(mag.issue_number)}
                    </TableCell>
                    <TableCell
                      title={mag.title}
                      className={cn(
                        'max-w-[260px] truncate text-foreground lg:max-w-md',
                        cellPaddingClass
                      )}
                    >
                      {mag.title}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'whitespace-nowrap text-muted-foreground tabular-nums',
                        cellPaddingClass
                      )}
                    >
                      {formatDateTR(mag.publication_date)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'whitespace-nowrap text-muted-foreground tabular-nums',
                        cellPaddingClass
                      )}
                    >
                      {typeof mag.page_count === 'number' && mag.page_count > 0
                        ? formatNumberTR(mag.page_count)
                        : '-'}
                    </TableCell>
                    <TableCell className={cn('whitespace-nowrap', cellPaddingClass)}>
                      <Badge variant={mag.is_published ? 'success' : 'warning'}>
                        {mag.is_published ? t('magazines.statusPublished') : t('magazines.statusDraft')}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn('text-right whitespace-nowrap', cellPaddingClass)}>
                      <div className="inline-flex justify-end">
                        <RowActions
                          id={String(mag.id)}
                          issue={mag.issue_number}
                          title={mag.title}
                          version={mag.version}
                          isTourTarget={index === 0 && isDesktop !== false}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
