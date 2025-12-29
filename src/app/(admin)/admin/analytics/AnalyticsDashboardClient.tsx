'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface AnalyticsDashboardClientProps {
    dailyStats: Array<{ date: string; views: number; unique_users: number }>

    summary: {
        totalViews: number
        uniqueReaders: number
        avgSessionDuration: number
    }
    magazines: Array<{ id: string; title: string; issue_number: number }>
}

export default function AnalyticsDashboardClient({ dailyStats, summary, magazines }: AnalyticsDashboardClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const selectedMagazineId = searchParams.get('magazineId') || 'all'

    const handleMagazineChange = (value: string) => {
        if (value === 'all') {
            router.push('/admin/analytics')
        } else {
            router.push(`/admin/analytics?magazineId=${value}`)
        }
    }

    const handleExport = () => {
        const headers = ['Date', 'Views', 'Unique Users']
        const csvContent = [
            headers.join(','),
            ...dailyStats.map(row => `${row.date},${row.views},${row.unique_users}`)
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `magazine_analytics_${selectedMagazineId}.csv`)
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
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Okuma Analitiği</h2>
                        <p className="text-sm text-neutral-500">
                            {selectedMagazineId === 'all' ? 'Tüm Dergiler' : magazines.find(m => m.id === selectedMagazineId)?.title || 'Seçili Dergi'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={selectedMagazineId} onValueChange={handleMagazineChange}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Dergi Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tüm Dergiler</SelectItem>
                            {magazines.map(mag => (
                                <SelectItem key={mag.id} value={mag.id}>
                                    No. #{mag.issue_number} - {mag.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button onClick={handleExport} variant="outline" size="icon" title="CSV İndir">
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Görüntülenme</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalViews}</div>
                        <p className="text-xs text-muted-foreground">
                            {selectedMagazineId === 'all' ? 'Tüm zamanlar' : 'Bu sayı için'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tekil Okuyucu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.uniqueReaders}</div>
                        <p className="text-xs text-muted-foreground">Oturum sayısı</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ort. Okuma Süresi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(summary.avgSessionDuration / 1000 / 60)} dk</div>
                        <p className="text-xs text-muted-foreground">Oturum başına</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 grid-cols-1">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Okunma Grafiği (Son 30 Gün)</CardTitle>
                        <CardDescription>Günlük sayfa görüntülenme sayıları</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyStats}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                    />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
