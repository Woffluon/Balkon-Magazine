'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, ChevronLeft, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { AnalyticsFilterBar } from './components/AnalyticsFilterBar'
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters'
import { fetchAnalyticsData } from '@/app/actions/analytics'

interface AnalyticsDashboardClientProps {
    magazines: Array<{ id: string; title: string; issue_number: number }>
    dailyStats?: Array<{ date: string; views: number; unique_users: number }>
    summary?: {
        totalViews: number
        uniqueReaders: number
        avgSessionDuration: number
    }
}

export default function AnalyticsDashboardClient({ magazines, dailyStats: initialDailyStats, summary: initialSummary }: AnalyticsDashboardClientProps) {
    const { filters, getDateRangeIso } = useAnalyticsFilters()

    // Fetch Data
    const { data, isLoading, isError } = useQuery({
        queryKey: ['analytics', filters],
        queryFn: async () => {
            // Prepare filters with resolved dates
            const dateRange = getDateRangeIso()
            const payload = { ...filters, dateRange: { ...filters.dateRange, ...dateRange } }
            return await fetchAnalyticsData(payload)
        },
        initialData: (initialDailyStats && initialSummary) ? {
            dailyStats: initialDailyStats,
            summary: initialSummary
        } : undefined
    })

    const summary = data?.summary || { totalViews: 0, uniqueReaders: 0, avgSessionDuration: 0 }
    const dailyStats = data?.dailyStats || []

    const handleExport = () => {
        const headers = ['Tarih', 'Görüntülenme', 'Tekil Kullanıcı']
        const csvContent = [
            headers.join(','),
            ...dailyStats.map((row: { date: string; views: number; unique_users: number }) =>
                `${row.date},${row.views},${row.unique_users}`
            )
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `analytics_export.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Okuma Analizleri</h2>
                        <p className="text-sm text-neutral-500">
                            Takip ettiğiniz yayınlara ait veriler
                        </p>
                    </div>
                </div>

                <Button onClick={handleExport} variant="outline" size="icon" title="Export CSV" disabled={isLoading || dailyStats.length === 0}>
                    <Download className="w-4 h-4" />
                </Button>
            </div>

            <AnalyticsFilterBar magazines={magazines} />

            {isLoading && (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {!isLoading && isError && (
                <div className="p-12 text-center text-red-500">
                    Veriler yüklenemedi. Lütfen tekrar deneyin.
                </div>
            )}

            {!isLoading && !isError && (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Toplam Görüntülenme</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{summary.totalViews}</div>
                                <p className="text-xs text-muted-foreground">
                                    Seçilen dönemde
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tekil Okuyucu</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{summary.uniqueReaders}</div>
                                <p className="text-xs text-muted-foreground">Tahmini tekil cihaz</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ort. Süre</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {Math.round(summary.avgSessionDuration / 1000 / 60)} dk
                                </div>
                                <p className="text-xs text-muted-foreground">Oturum başına</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 grid-cols-1">
                        <Card className="col-span-1">
                            <CardHeader>
                                <CardTitle>Trendler</CardTitle>
                                <CardDescription>Günlük görüntülenme sayıları</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[300px]">
                                    {dailyStats.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={dailyStats}>
                                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#888888"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                />
                                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                                />
                                                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            Bu dönem için veri yok
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}
