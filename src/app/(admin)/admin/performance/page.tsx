import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Gauge,
  TrendingUp,
} from 'lucide-react'
import { getPerformanceDashboardData, type PerformanceStats } from '@/app/actions/performance-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatNumberTR } from '@/lib/formatters/tr'
import { t } from '@/lib/i18n'
import { requireAdmin } from '@/lib/services/authorization'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: `${t('performance.title')} - Balkon Dergisi`,
  robots: {
    index: false,
    follow: false,
  },
}

type MetricCode = 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB' | 'INP'

const KNOWN_METRICS = new Set<MetricCode>(['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'])

function formatMetricValue(value: number, metric: string, unit: string): string {
  const formatted =
    metric === 'CLS'
      ? formatNumberTR(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : formatNumberTR(value, { maximumFractionDigits: 0 })
  return unit ? `${formatted} ${unit}` : formatted
}

function getMetricDescription(metric: string): { name: string; target: string } | null {
  if (!KNOWN_METRICS.has(metric as MetricCode)) {
    return null
  }
  const code = metric as MetricCode
  return {
    name: t(`performance.metrics.${code}.name`),
    target: t(`performance.metrics.${code}.target`),
  }
}

export default async function PerformanceDashboardPage(props: {
  searchParams: Promise<{ days?: string }>
}) {
  const searchParams = await props.searchParams

  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthorizationError') {
      redirect('/admin/login')
    }
    throw error
  }

  const daysParam = searchParams.days ? parseInt(searchParams.days, 10) : 7
  const activeDays = [1, 7, 30].includes(daysParam) ? daysParam : 7

  const result = await getPerformanceDashboardData(activeDays)

  const statsList: PerformanceStats[] = (result.success && result.data?.stats) || []
  const totalLogs = (result.success && result.data?.totalCount) || 0

  const budgetedStats = statsList.filter((s) => s.budget > 0)
  const metBudgetCount = budgetedStats.filter((s) => s.p75 <= s.budget).length

  const rangeOptions = [
    { label: t('performance.range24h'), value: 1 },
    { label: t('performance.range7d'), value: 7 },
    { label: t('performance.range30d'), value: 30 },
  ]

  const policies = [
    {
      label: t('performance.policies.serviceWorkerLabel'),
      desc: t('performance.policies.serviceWorkerDesc'),
    },
    {
      label: t('performance.policies.imagesLabel'),
      desc: t('performance.policies.imagesDesc'),
    },
    {
      label: t('performance.policies.qualityLabel'),
      desc: t('performance.policies.qualityDesc'),
    },
    {
      label: t('performance.policies.pdfLimitLabel'),
      desc: t('performance.policies.pdfLimitDesc'),
    },
  ]

  return (
    <div className="responsive-container py-6 sm:py-8">
      {/* Page Header & Range Selector */}
      <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <Gauge className="size-6 shrink-0 text-primary" aria-hidden="true" />
            <span>{t('performance.title')}</span>
          </h1>
          <p className="text-sm text-muted-foreground">{t('performance.subtitle')}</p>
        </div>

        <nav
          aria-label={t('performance.rangeAriaLabel')}
          data-tour="performance-ranges"
          className="inline-flex w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-xs md:w-auto"
        >
          {rangeOptions.map((opt) => {
            const isActive = activeDays === opt.value
            return (
              <Button
                key={opt.value}
                asChild
                size="sm"
                variant={isActive ? 'default' : 'ghost'}
                className="flex-1 md:flex-initial"
              >
                <Link
                  href={`/admin/performance?days=${opt.value}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {opt.label}
                </Link>
              </Button>
            )
          })}
        </nav>
      </div>

      {/* Error State */}
      {!result.success ? (
        <div
          role="alert"
          className="mb-8 flex flex-col items-center justify-center rounded-2xl border border-status-error-border bg-status-error-bg p-8 text-center text-status-error-fg sm:p-10"
        >
          <AlertCircle className="mb-3 size-8 shrink-0" aria-hidden="true" />
          <h2 className="text-lg font-semibold">{t('performance.errorTitle')}</h2>
          <p className="mt-1.5 max-w-md text-sm opacity-90">
            {t('performance.errorDescription')}
          </p>
        </div>
      ) : null}

      {/* Empty State */}
      {result.success && statsList.length === 0 ? (
        <div className="mb-8">
          <Empty
            icon={<Clock />}
            title={t('performance.emptyTitle')}
            description={t('performance.emptyDescription')}
          />
        </div>
      ) : null}

      {/* Overview & Metric Budgets */}
      {result.success && statsList.length > 0 ? (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-border bg-card text-card-foreground shadow-xs">
              <CardContent className="flex items-center gap-4 p-5 sm:p-6">
                <div className="rounded-xl bg-status-error-bg p-3 text-status-error-fg">
                  <Activity className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {t('performance.totalLogs')}
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-foreground tabular-nums">
                    {formatNumberTR(totalLogs)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card text-card-foreground shadow-xs">
              <CardContent className="flex items-center gap-4 p-5 sm:p-6">
                <div className="rounded-xl bg-status-success-bg p-3 text-status-success-fg">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {t('performance.budgetCompliance')}
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-foreground tabular-nums">
                    {budgetedStats.length > 0
                      ? t('performance.budgetRatio', {
                          met: formatNumberTR(metBudgetCount),
                          total: formatNumberTR(budgetedStats.length),
                        })
                      : t('performance.budgetInsufficientSamples')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card text-card-foreground shadow-xs">
              <CardContent className="flex items-center gap-4 p-5 sm:p-6">
                <div className="rounded-xl bg-status-info-bg p-3 text-status-info-fg">
                  <Database className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {t('performance.offlineCache')}
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-foreground">
                    {t('performance.offlineActive')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <section data-tour="performance-budgets" className="space-y-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground sm:text-xl">
              <TrendingUp className="size-5 text-primary" aria-hidden="true" />
              <span>{t('performance.budgetsHeading')}</span>
            </h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Metrics Table Card */}
              <Card className="overflow-hidden border-border bg-card text-card-foreground shadow-xs">
                <CardHeader className="border-b border-border bg-muted/40 py-4">
                  <CardTitle className="text-base font-semibold">
                    {t('performance.tableTitle')}
                  </CardTitle>
                  <CardDescription>{t('performance.p75Note')}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead className="px-4 font-semibold">
                          {t('performance.colMetric')}
                        </TableHead>
                        <TableHead className="px-4 font-semibold">
                          {t('performance.colSamples')}
                        </TableHead>
                        <TableHead className="px-4 font-semibold">
                          {t('performance.colAvg')}
                        </TableHead>
                        <TableHead className="px-4 font-semibold">
                          {t('performance.colP75')}
                        </TableHead>
                        <TableHead className="px-4 font-semibold">
                          {t('performance.colP95')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statsList.map((stat) => {
                        const isExceeded = stat.budget > 0 && stat.p75 > stat.budget
                        return (
                          <TableRow key={stat.metric}>
                            <TableCell className="px-4 py-3.5 font-semibold text-foreground">
                              {stat.metric}
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-xs text-muted-foreground tabular-nums">
                              {t('performance.samplesUnit', {
                                count: formatNumberTR(stat.count),
                              })}
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-sm text-foreground tabular-nums">
                              {formatMetricValue(stat.avg, stat.metric, stat.unit)}
                            </TableCell>
                            <TableCell className="px-4 py-3.5 tabular-nums">
                              <span
                                className={cn(
                                  'font-semibold',
                                  isExceeded ? 'text-status-error-fg' : 'text-status-success-fg'
                                )}
                              >
                                {formatMetricValue(stat.p75, stat.metric, stat.unit)}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-sm text-muted-foreground tabular-nums">
                              {formatMetricValue(stat.p95, stat.metric, stat.unit)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Budget Comparison Cards */}
              <div className="space-y-4">
                {statsList.map((stat) => {
                  const percent =
                    stat.budget > 0 ? Math.min(100, Math.round((stat.p75 / stat.budget) * 100)) : 0
                  const isExceeded = stat.budget > 0 && stat.p75 > stat.budget
                  const desc = getMetricDescription(stat.metric)

                  return (
                    <Card
                      key={stat.metric}
                      className="border-border bg-card text-card-foreground shadow-xs"
                    >
                      <CardContent className="space-y-4 p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-foreground">
                              {stat.metric}
                              {desc ? (
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                  · {desc.name}
                                </span>
                              ) : null}
                            </h3>
                            {desc ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {t('performance.budgetLabel')}: {desc.target}
                              </p>
                            ) : null}
                          </div>
                          <Badge variant={isExceeded ? 'destructive' : 'success'}>
                            {isExceeded
                              ? t('performance.statusExceeded')
                              : t('performance.statusGood')}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-muted-foreground tabular-nums">
                            <span>
                              {t('performance.budgetLabel')}:{' '}
                              {formatMetricValue(stat.budget, stat.metric, stat.unit)}
                            </span>
                            <span className="text-foreground">
                              {t('performance.currentP75Label')}:{' '}
                              {formatMetricValue(stat.p75, stat.metric, stat.unit)}
                            </span>
                          </div>
                          <div
                            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${stat.metric} ${t('performance.budgetCompliance')}`}
                          >
                            <div
                              className={cn(
                                'h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none',
                                isExceeded ? 'bg-destructive' : 'bg-status-success-fg'
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* Caching & Processing Policies */}
      <Card className="mt-8 border-border bg-card text-card-foreground shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Cpu className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>{t('performance.policiesTitle')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
            {policies.map((policy) => (
              <li
                key={policy.label}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <span className="font-medium text-foreground">{policy.label}</span>
                <span className="text-muted-foreground sm:text-right">{policy.desc}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
