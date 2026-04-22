'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { UserMenu } from '../UserMenu'
import type { AnalyticsDashboardData } from '@/app/actions/analytics-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
    ArrowLeft, 
    BarChart3, 
    TrendingUp, 
    BookOpen, 
    CalendarDays, 
    Users, 
    Smartphone, 
    Monitor, 
    Tablet,
    Filter,
    RefreshCw
} from 'lucide-react'
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts'
import { getAnalyticsDashboardData } from '@/app/actions/analytics-actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { motion } from 'motion/react'

interface Magazine {
    id: string
    title: string
    issue_number: number
}

interface AnalyticsDashboardClientProps {
    initialData: AnalyticsDashboardData
    userEmail: string
    magazines: Magazine[]
}

export function AnalyticsDashboardClient({ initialData, userEmail, magazines }: AnalyticsDashboardClientProps) {
    const [data, setData] = useState<AnalyticsDashboardData>(initialData)
    const [days, setDays] = useState<number>(30)
    const [selectedMagazineId, setSelectedMagazineId] = useState<string>('all')
    const [loading, setLoading] = useState(false)

    const handleFilterChange = async (newDays: number, newMagId: string) => {
        setLoading(true)
        try {
            const magParam = newMagId === 'all' ? null : newMagId
            const result = await getAnalyticsDashboardData(newDays, magParam)
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

    const onDaysChange = (value: string) => {
        const val = parseInt(value, 10)
        setDays(val)
        handleFilterChange(val, selectedMagazineId)
    }

    const onMagazineChange = (value: string) => {
        setSelectedMagazineId(value)
        handleFilterChange(days, value)
    }

    // Format date for the charts (e.g., 'YYYY-MM-DD' -> 'DD MMM')
    const formatChartDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    }

    const formattedDailyStats = useMemo(() => {
        return data.daily_stats.map(item => ({
            ...item,
            formattedDate: formatChartDate(item.date)
        }))
    }, [data.daily_stats])

    const deviceChartData = useMemo(() => {
        return data.device_stats.map(item => ({
            name: item.device,
            value: item.count
        }))
    }, [data.device_stats])

    const COLORS = ['#dc2626', '#3b82f6', '#10b981', '#f59e0b']

    // Calculate Average views per unique visitor
    const avgViewsPerVisitor = data.unique_visitors > 0 
        ? (data.total_views / data.unique_visitors).toFixed(1) 
        : '0'

    return (
        <main className="w-full min-h-screen bg-[#f8fafc] pt-4 pb-12 font-sans">
            <div className="responsive-container py-6 sm:py-8">

                {/* Header & Navigation */}
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-6">
                    <div className="flex items-center gap-3">
                        <motion.div whileHover={{ x: -4 }} whileTap={{ scale: 0.95 }}>
                            <Link
                                href="/admin"
                                className="group flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-all"
                                title="Geri Dön"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        </motion.div>
                        <div className="flex flex-col">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-none">Analiz Paneli</h1>
                            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Canlı Veriler
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 px-3 border-r border-slate-100 hidden sm:flex">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filtrele</span>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Select value={selectedMagazineId} onValueChange={onMagazineChange} disabled={loading}>
                                <SelectTrigger className="w-full sm:w-[220px] border-none bg-slate-50 font-medium focus:ring-0">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-slate-500" />
                                        <SelectValue placeholder="Dergi Seçin" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200">
                                    <SelectItem value="all">Tüm Dergiler</SelectItem>
                                    {magazines.map(mag => (
                                        <SelectItem key={mag.id} value={mag.id}>
                                            Sayı {mag.issue_number}: {mag.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={days.toString()} onValueChange={onDaysChange} disabled={loading}>
                                <SelectTrigger className="w-full sm:w-[160px] border-none bg-slate-50 font-medium focus:ring-0">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-slate-500" />
                                        <SelectValue placeholder="Zaman Aralığı" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200">
                                    <SelectItem value="7">Son 7 Gün</SelectItem>
                                    <SelectItem value="30">Son 30 Gün</SelectItem>
                                    <SelectItem value="90">Son 90 Gün</SelectItem>
                                    <SelectItem value="365">Son 1 Yıl</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="hidden sm:block border-l border-slate-100 pl-4 py-1">
                            <UserMenu userEmail={userEmail} />
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { 
                            title: 'Toplam İzlenme', 
                            value: data.total_views.toLocaleString('tr-TR'), 
                            sub: 'Seçili periyot', 
                            icon: BarChart3, 
                            color: 'text-red-600', 
                            bg: 'bg-red-50' 
                        },
                        { 
                            title: 'Tekil Ziyaretçi', 
                            value: data.unique_visitors.toLocaleString('tr-TR'), 
                            sub: 'Anonim oturumlar', 
                            icon: Users, 
                            color: 'text-blue-600', 
                            bg: 'bg-blue-50' 
                        },
                        { 
                            title: 'Etkileşim Oranı', 
                            value: avgViewsPerVisitor, 
                            sub: 'Ziyaretçi başına izlenme', 
                            icon: TrendingUp, 
                            color: 'text-emerald-600', 
                            bg: 'bg-emerald-50' 
                        },
                        { 
                            title: 'Genel Toplam', 
                            value: data.totalViewsAllTime.toLocaleString('tr-TR'), 
                            sub: 'Tüm zamanlar', 
                            icon: RefreshCw, 
                            color: 'text-amber-600', 
                            bg: 'bg-amber-50' 
                        }
                    ].map((card, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden group">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl ${card.bg} ${card.color} transition-transform group-hover:scale-110`}>
                                            <card.icon className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{card.title}</p>
                                        <div className="text-3xl font-bold text-slate-900 mt-1">{card.value}</div>
                                        <p className="text-xs text-slate-400 mt-2 font-medium">{card.sub}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Main Trend Chart */}
                    <motion.div 
                        className="lg:col-span-2"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="border-none shadow-sm rounded-2xl h-full">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-bold text-slate-900">İzlenme Trendi</CardTitle>
                                    <CardDescription className="font-medium text-slate-400">Günlük bazda toplam ve tekil izlenmeler</CardDescription>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest hidden sm:flex">
                                    <div className="flex items-center gap-1.5 text-red-600">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                                        Toplam
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                                        Tekil
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-6">
                                <div className="h-[300px] sm:h-[380px] w-full transition-opacity duration-300 relative" style={{ minHeight: '300px' }}>
                                    {formattedDailyStats.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={formattedDailyStats}
                                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis
                                                    dataKey="formattedDate"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                                                    minTickGap={30}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                                                    width={35}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                                                    labelStyle={{ color: '#64748b', marginBottom: '8px', fontWeight: 700 }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="views"
                                                    name="Toplam İzlenme"
                                                    stroke="#dc2626"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorTotal)"
                                                    animationDuration={1500}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="unique_views"
                                                    name="Tekil Ziyaretçi"
                                                    stroke="#e2e8f0"
                                                    strokeWidth={2}
                                                    fill="transparent"
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <BarChart3 className="w-12 h-12 opacity-20" />
                                            <p className="font-medium">Henüz yeterli veri bulunmuyor.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Right Column: Platform & Top Mag */}
                    <div className="flex flex-col gap-6">
                        
                        {/* Device Distribution */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Card className="border-none shadow-sm rounded-2xl">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-bold text-slate-900">Cihaz Dağılımı</CardTitle>
                                    <CardDescription className="font-medium text-slate-400">Ziyaretçilerin kullandığı platformlar</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-6">
                                    <div className="h-[200px] sm:h-[250px] w-full transition-opacity duration-300 relative" style={{ minHeight: '200px' }}>
                                        {deviceChartData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={deviceChartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={8}
                                                        dataKey="value"
                                                    >
                                                        {deviceChartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Legend 
                                                        verticalAlign="bottom" 
                                                        align="center"
                                                        iconType="circle"
                                                        formatter={(value) => <span className="text-xs font-bold text-slate-600">{value}</span>}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                Veri Yok
                                            </div>
                                        )}
                                    </div>
                                    <div className={`grid grid-cols-3 gap-2 mt-4 transition-opacity duration-300 ${loading ? 'opacity-30' : 'opacity-100'}`}>
                                        <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50">
                                            <Monitor className="w-4 h-4 text-slate-400 mb-1" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Masaüstü</span>
                                        </div>
                                        <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50">
                                            <Smartphone className="w-4 h-4 text-slate-400 mb-1" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Mobil</span>
                                        </div>
                                        <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50">
                                            <Tablet className="w-4 h-4 text-slate-400 mb-1" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Tablet</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Top Magazines (Mini) */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                            className="flex-grow"
                        >
                            <Card className="border-none shadow-sm rounded-2xl h-full">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold text-slate-900">En Popüler Sayılar</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {data.top_magazines.length > 0 ? (
                                            data.top_magazines.slice(0, 5).map((mag, idx) => (
                                                <div key={mag.id} className="flex items-center justify-between group cursor-default">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                                                            {mag.issue_number}
                                                        </div>
                                                        <div className="max-w-[120px]">
                                                            <div className="text-sm font-bold text-slate-700 truncate">{mag.title}</div>
                                                            <div className="text-[10px] font-medium text-slate-400 uppercase">Dergi Sayısı</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-black text-slate-900">{mag.total_views.toLocaleString()}</div>
                                                        <div className="text-[10px] font-bold text-emerald-500 uppercase">İzlenme</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-400 text-center py-4">Veri bulunamadı.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </main>
    )
}
