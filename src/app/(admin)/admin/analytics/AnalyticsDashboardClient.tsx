'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserMenu } from '../UserMenu'
import type { AnalyticsDashboardData } from '@/app/actions/analytics-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, BarChart3, TrendingUp, BookOpen, CalendarDays } from 'lucide-react'
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'
import { getAnalyticsDashboardData } from '@/app/actions/analytics-actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface AnalyticsDashboardClientProps {
    initialData: AnalyticsDashboardData
    userEmail: string
}

export function AnalyticsDashboardClient({ initialData, userEmail }: AnalyticsDashboardClientProps) {
    const [data, setData] = useState<AnalyticsDashboardData>(initialData)
    const [days, setDays] = useState<number>(30)
    const [loading, setLoading] = useState(false)

    const handleDaysChange = async (value: string) => {
        const newDays = parseInt(value, 10)
        setDays(newDays)
        setLoading(true)

        try {
            const result = await getAnalyticsDashboardData(newDays)
            if (result.success) {
                setData(result.data)
            } else {
                toast.error('Veriler güncellenirken bir hata oluştu.')
            }
        } catch (error) {
            toast.error('Beklenmeyen bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    // Format date for the charts (e.g., 'YYYY-MM-DD' -> 'DD MMM')
    const formatChartDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    }

    const formattedDailyViews = data.dailyViews.map(item => ({
        ...item,
        formattedDate: formatChartDate(item.date)
    }))

    return (
        <main className="w-full min-h-screen bg-[#f9f9f9] pt-4 pb-12">
            <div className="responsive-container py-6 sm:py-8">

                {/* Header & Navigation */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin"
                            className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
                            title="Dergilere Dön"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900">İstatistikler</h1>
                            <p className="text-sm text-gray-500 mt-1">Dergilerinizin görüntülenme analizleri</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <Select value={days.toString()} onValueChange={handleDaysChange} disabled={loading}>
                            <SelectTrigger className="w-[180px] bg-white">
                                <SelectValue placeholder="Zaman Aralığı" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Son 7 Gün</SelectItem>
                                <SelectItem value="30">Son 30 Gün</SelectItem>
                                <SelectItem value="90">Son 90 Gün</SelectItem>
                                <SelectItem value="365">Son 1 Yıl</SelectItem>
                            </SelectContent>
                        </Select>
                        <UserMenu userEmail={userEmail} />
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <Card className="border-none shadow-sm h-full">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Toplam Görüntülenme</CardTitle>
                            <BarChart3 className="w-4 h-4 text-primary opacity-70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{data.totalViewsAllTime.toLocaleString('tr-TR')}</div>
                            <p className="text-xs text-gray-500 mt-1">Tüm zamanlar</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm h-full">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Seçili Dönem ({days} Gün)</CardTitle>
                            <TrendingUp className="w-4 h-4 text-emerald-600 opacity-70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{data.viewsLast30Days.toLocaleString('tr-TR')}</div>
                            <p className="text-xs text-gray-500 mt-1">Bu periyotta edilen görüntülenmeler</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm h-full sm:col-span-2 lg:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">En Çok Okunan Dergi</CardTitle>
                            <BookOpen className="w-4 h-4 text-blue-600 opacity-70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-gray-900 truncate">
                                {data.topMagazines.length > 0 ? data.topMagazines[0].title : 'Veri Yok'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {data.topMagazines.length > 0
                                    ? `${data.topMagazines[0].total_views.toLocaleString('tr-TR')} görüntülenme`
                                    : 'Henüz yeterli veri yok'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts and Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Trend Chart */}
                    <Card className="lg:col-span-2 border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 opacity-70" />
                                Günlük Görüntülenme Trendi
                            </CardTitle>
                            <CardDescription>
                                Son {days} gün içerisindeki genel yoğunluk
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className={`h-[350px] w-full transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                                {formattedDailyViews.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={formattedDailyViews}
                                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                            <XAxis
                                                dataKey="formattedDate"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                                minTickGap={30}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                                width={40}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                                itemStyle={{ color: '#111827', fontWeight: 600 }}
                                                labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="views"
                                                name="Okunma"
                                                stroke="#dc2626"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorViews)"
                                                animationDuration={1000}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        Henüz grafik için yeterli veri bulunmuyor.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Magazines Chart */}
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle>En Çok Okunan Dergiler</CardTitle>
                            <CardDescription>Toplam görüntülenme sayısına göre (Tüm Zamanlar)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className={`h-[350px] w-full transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                                {data.topMagazines.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={data.topMagazines}
                                            layout="vertical"
                                            margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="issue_number"
                                                type="category"
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(val) => `Sı ${val}`}
                                                width={50}
                                                tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 500 }}
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#f3f4f6' }}
                                                formatter={(value) => [value, 'Görüntülenme']}
                                                labelFormatter={(label) => `Sayı ${label}`}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar
                                                dataKey="total_views"
                                                fill="#3b82f6"
                                                radius={[0, 4, 4, 0]}
                                                barSize={30}
                                                animationDuration={1000}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-center px-4">
                                        Gösterilecek dergi verisi bulunamadı.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    )
}
