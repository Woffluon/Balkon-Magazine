'use client'

import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Loader2,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import {
  getAnalyticsDashboardData,
  getPageAnalytics,
  type AnalyticsDashboardData,
  type PageAnalyticsData,
} from '@/app/actions/analytics-actions'
import { EmptyStateHint } from '@/components/admin/tour/EmptyStateHint'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatNumberTR, parseLocalDateTR } from '@/lib/formatters/tr'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface Magazine {
  id: string
  title: string
  issue_number: number
}

interface AnalyticsDashboardClientProps {
  initialData: AnalyticsDashboardData
  userEmail?: string
  magazines: Magazine[]
}

const DEVICE_COLORS = ['#dc2626', '#2563eb', '#059669', '#d97706']

const shortChartDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
})

function formatChartDate(dateStr: string): string {
  const parsed = parseLocalDateTR(dateStr)
  return parsed ? shortChartDateFormatter.format(parsed) : dateStr
}

export function AnalyticsDashboardClient({
  initialData,
  magazines,
}: AnalyticsDashboardClientProps) {
  const [data, setData] = useState<AnalyticsDashboardData>(initialData)
  const [days, setDays] = useState<number>(30)
  const [selectedMagazineId, setSelectedMagazineId] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [pageAnalytics, setPageAnalytics] = useState<PageAnalyticsData[]>([])
  const [pageAnalyticsLoading, setPageAnalyticsLoading] = useState(false)

  const shouldReduceMotion = useReducedMotion()

  const fetchPageAnalytics = async (magId: string, daysVal: number) => {
    if (magId === 'all') {
      setPageAnalytics([])
      return
    }
    setPageAnalyticsLoading(true)
    try {
      const result = await getPageAnalytics(magId, daysVal)
      if (result.success) {
        setPageAnalytics(result.data)
      } else {
        toast.error(t('errors.pageAnalyticsLoadFailed'))
      }
    } catch {
      toast.error(t('errors.pageAnalyticsLoadFailed'))
    } finally {
      setPageAnalyticsLoading(false)
    }
  }

  const handleFilterChange = async (newDays: number, newMagId: string) => {
    setLoading(true)
    try {
      const magParam = newMagId === 'all' ? null : newMagId
      const result = await getAnalyticsDashboardData(newDays, magParam)
      if (result.success) {
        setData(result.data)
      } else {
        toast.error(t('errors.analyticsLoadFailed'))
      }

      await fetchPageAnalytics(newMagId, newDays)
    } catch {
      toast.error(t('errors.analyticsLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const onDaysChange = (value: string) => {
    const val = parseInt(value, 10)
    setDays(val)
    handleFilterChange(val, selectedMagazineId)
  }

  const onMagazineChange = (value: string) => {
    setSelectedMagazineId(value)
    handleFilterChange(days, value)
  }

  const formattedDailyStats = useMemo(() => {
    return data.daily_stats.map((item) => ({
      ...item,
      formattedDate: formatChartDate(item.date),
    }))
  }, [data.daily_stats])

  const deviceChartData = useMemo(() => {
    return data.device_stats.map((item) => ({
      name: item.device,
      value: item.count,
    }))
  }, [data.device_stats])

  const funnelData = useMemo(() => {
    if (pageAnalytics.length === 0) return []

    const page1Data = pageAnalytics.find((p) => p.page_number === 1)
    const page1UniqueViewers = page1Data?.unique_viewers || 0

    return pageAnalytics.map((item) => {
      const percentage =
        page1UniqueViewers > 0
          ? Math.round((item.unique_viewers / page1UniqueViewers) * 100)
          : 0

      return {
        ...item,
        percentage,
      }
    })
  }, [pageAnalytics])

  const avgViewsPerVisitor =
    data.unique_visitors > 0
      ? formatNumberTR(data.total_views / data.unique_visitors, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : formatNumberTR(0)

  const kpiCards = [
    {
      title: t('analytics.totalViews'),
      value: formatNumberTR(data.total_views),
      sub: t('analytics.periodSub'),
      icon: BarChart3,
      iconClass: 'bg-status-error-bg text-status-error-fg',
    },
    {
      title: t('analytics.uniqueVisitors'),
      value: formatNumberTR(data.unique_visitors),
      sub: t('analytics.visitorsSub'),
      icon: Users,
      iconClass: 'bg-status-info-bg text-status-info-fg',
    },
    {
      title: t('analytics.engagementRate'),
      value: avgViewsPerVisitor,
      sub: t('analytics.engagementSub'),
      icon: TrendingUp,
      iconClass: 'bg-status-success-bg text-status-success-fg',
    },
    {
      title: t('analytics.allTimeViews'),
      value: formatNumberTR(data.totalViewsAllTime),
      sub: t('analytics.allTimeSub'),
      icon: RefreshCw,
      iconClass: 'bg-status-warning-bg text-status-warning-fg',
    },
  ]

  const motionInitial = shouldReduceMotion
    ? { opacity: 1, transform: 'translateY(0px)' }
    : { opacity: 0, transform: 'translateY(8px)' }
  const motionAnimate = { opacity: 1, transform: 'translateY(0px)' }
  const chartAnimDuration = shouldReduceMotion ? 0 : 300

  const tooltipContentStyle = {
    backgroundColor: 'var(--popover)',
    borderColor: 'var(--border)',
    borderWidth: '1px',
    borderRadius: '12px',
    color: 'var(--popover-foreground)',
    boxShadow: '0 8px 24px -4px rgb(0 0 0 / 0.16)',
  }

  return (
    <div className="responsive-container py-6 sm:py-8">
      {/* Page Header & Filters */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('analytics.title')}
          </h1>
          <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="size-2 rounded-full bg-status-success-fg" aria-hidden="true" />
            <span>{t('analytics.liveStatus')}</span>
          </p>
        </div>

        <div
          data-tour="analytics-filters"
          className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-2 shadow-xs sm:flex-row sm:items-center"
        >
          <Select
            value={selectedMagazineId}
            onValueChange={onMagazineChange}
            disabled={loading}
          >
            <SelectTrigger
              aria-label={t('analytics.filterLabel')}
              className="w-full sm:w-[230px]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <SelectValue placeholder={t('analytics.selectMagazinePlaceholder')} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('analytics.allMagazines')}</SelectItem>
              {magazines.map((mag) => (
                <SelectItem key={mag.id} value={mag.id}>
                  {t('magazines.colIssue')} {mag.issue_number}: {mag.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={days.toString()}
            onValueChange={onDaysChange}
            disabled={loading}
          >
            <SelectTrigger
              aria-label={t('analytics.rangeAriaLabel')}
              className="w-full sm:w-[160px]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('analytics.range7')}</SelectItem>
              <SelectItem value="30">{t('analytics.range30')}</SelectItem>
              <SelectItem value="90">{t('analytics.range90')}</SelectItem>
              <SelectItem value="365">{t('analytics.range365')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div
        data-tour="analytics-kpis"
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {kpiCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={motionInitial}
            animate={motionAnimate}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.18,
              delay: shouldReduceMotion ? 0 : idx * 0.04,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            <Card className="border-border bg-card text-card-foreground shadow-xs">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className={cn('rounded-xl p-2.5', card.iconClass)}>
                    <card.icon className="size-5" aria-hidden="true" />
                  </div>
                  {loading ? (
                    <Loader2
                      className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {card.title}
                </p>
                <div className="mt-1 text-3xl font-bold tracking-tight text-foreground tabular-nums">
                  {card.value}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Charts Grid */}
      <div data-tour="analytics-charts" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Trend AreaChart */}
        <motion.div
          className="lg:col-span-2"
          initial={motionInitial}
          animate={motionAnimate}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.2,
            delay: shouldReduceMotion ? 0 : 0.12,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          <Card className="h-full border-border bg-card text-card-foreground shadow-xs">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  {t('analytics.dailyTrendTitle')}
                </CardTitle>
                <CardDescription>{t('analytics.dailyTrendDescription')}</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5 text-foreground">
                  <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
                  <span>{t('analytics.legendTotal')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                  <span>{t('analytics.legendUnique')}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="relative h-[300px] w-full sm:h-[360px]">
                {loading ? <ChartLoadingOverlay /> : null}
                {formattedDailyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={formattedDailyStats}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="formattedDate"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        minTickGap={30}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        width={42}
                        tickFormatter={(val: number) => formatNumberTR(val)}
                      />
                      <Tooltip
                        contentStyle={tooltipContentStyle}
                        itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                        labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '6px' }}
                        formatter={(val) =>
                          typeof val === 'number' ? formatNumberTR(val) : String(val ?? '')
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        name={t('analytics.totalViews')}
                        stroke="#dc2626"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                        isAnimationActive={!shouldReduceMotion}
                        animationDuration={chartAnimDuration}
                      />
                      <Area
                        type="monotone"
                        dataKey="unique_views"
                        name={t('analytics.uniqueVisitors')}
                        stroke="#71717a"
                        strokeWidth={2}
                        fill="transparent"
                        isAnimationActive={!shouldReduceMotion}
                        animationDuration={chartAnimDuration}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <BarChart3 className="size-10 opacity-40" aria-hidden="true" />
                    <p className="text-sm font-medium">{t('analytics.noTrendData')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Device Distribution & Top Magazines */}
        <div className="flex flex-col gap-6">
          <Card className="border-border bg-card text-card-foreground shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">
                {t('analytics.deviceTitle')}
              </CardTitle>
              <CardDescription>{t('analytics.deviceDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="relative h-[220px] w-full">
                {loading ? <ChartLoadingOverlay /> : null}
                {deviceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={78}
                        paddingAngle={6}
                        dataKey="value"
                        isAnimationActive={!shouldReduceMotion}
                        animationDuration={chartAnimDuration}
                      >
                        {deviceChartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={DEVICE_COLORS[index % DEVICE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipContentStyle}
                        formatter={(val) =>
                          typeof val === 'number' ? formatNumberTR(val) : String(val ?? '')
                        }
                      />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-xs font-medium text-foreground">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t('analytics.noDeviceData')}
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center rounded-lg border border-border bg-muted/40 p-2">
                  <Monitor className="mb-1 size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-xs font-medium text-foreground">
                    {t('analytics.desktop')}
                  </span>
                </div>
                <div className="flex flex-col items-center rounded-lg border border-border bg-muted/40 p-2">
                  <Smartphone className="mb-1 size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-xs font-medium text-foreground">
                    {t('analytics.mobile')}
                  </span>
                </div>
                <div className="flex flex-col items-center rounded-lg border border-border bg-muted/40 p-2">
                  <Tablet className="mb-1 size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-xs font-medium text-foreground">
                    {t('analytics.tablet')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 border-border bg-card text-card-foreground shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {t('analytics.topMagazinesTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.top_magazines.length > 0 ? (
                <div className="space-y-3">
                  {data.top_magazines.slice(0, 5).map((mag) => (
                    <div
                      key={mag.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-muted px-2 text-xs font-semibold text-foreground tabular-nums">
                          {formatNumberTR(mag.issue_number)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            title={mag.title}
                            className="truncate text-sm font-medium text-foreground"
                          >
                            {mag.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('magazines.colIssue')} {formatNumberTR(mag.issue_number)}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold text-foreground tabular-nums">
                          {formatNumberTR(mag.total_views)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('analytics.viewsUnit')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('analytics.noTopMagazines')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Page-Level Engagement & Funnel Analysis */}
      <div className="mt-8">
        {selectedMagazineId !== 'all' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card text-card-foreground shadow-xs">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {t('analytics.pageDurationTitle')}
                </CardTitle>
                <CardDescription>{t('analytics.pageDurationDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                {pageAnalyticsLoading ? (
                  <PageAnalyticsSkeleton />
                ) : pageAnalytics.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={pageAnalytics}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="page_number"
                          tickFormatter={(page) => `S. ${page}`}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                          width={36}
                          tickFormatter={(val: number) => formatNumberTR(val)}
                        />
                        <Tooltip
                          contentStyle={tooltipContentStyle}
                          itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                          labelFormatter={(page) => `${t('magazines.colPages')} ${page}`}
                          formatter={(val) =>
                            typeof val === 'number'
                              ? formatNumberTR(val, { maximumFractionDigits: 1 })
                              : String(val ?? '')
                          }
                        />
                        <Bar
                          dataKey="average_duration_seconds"
                          name={t('analytics.avgDurationLabel')}
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={!shouldReduceMotion}
                          animationDuration={chartAnimDuration}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <PageAnalyticsEmptyState />
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card text-card-foreground shadow-xs">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {t('analytics.funnelTitle')}
                </CardTitle>
                <CardDescription>{t('analytics.funnelDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                {pageAnalyticsLoading ? (
                  <PageAnalyticsSkeleton />
                ) : pageAnalytics.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={funnelData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="page_number"
                          tickFormatter={(page) => `S. ${page}`}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                          width={40}
                          domain={[0, 100]}
                          tickFormatter={(val) => `%${val}`}
                        />
                        <Tooltip
                          contentStyle={tooltipContentStyle}
                          itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                          labelFormatter={(page) => `${t('magazines.colPages')} ${page}`}
                          formatter={(val) => `%${val}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="percentage"
                          name={t('analytics.readerRatioLabel')}
                          stroke="#dc2626"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorPercentage)"
                          isAnimationActive={!shouldReduceMotion}
                          animationDuration={chartAnimDuration}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <PageAnalyticsEmptyState />
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <EmptyStateHint
            title={t('analytics.selectMagazinePromptTitle')}
            description={t('analytics.selectMagazinePromptBody')}
            tourPage="analytics"
          />
        )}
      </div>
    </div>
  )
}

function ChartLoadingOverlay() {
  return (
    <div
      role="status"
      aria-label={t('common.loading')}
      className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/70 backdrop-blur-[1px]"
    >
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        <span>{t('common.loading')}</span>
      </div>
    </div>
  )
}

const PageAnalyticsSkeleton = () => (
  <div role="status" aria-label={t('common.loading')} className="space-y-4">
    <div className="h-[300px] animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
  </div>
)

const PageAnalyticsEmptyState = () => (
  <Empty
    icon={<BarChart3 />}
    title={t('analytics.noPageData')}
    className="min-h-[300px] border-none bg-transparent px-4 py-6"
  />
)
