import { requireAdmin } from '@/lib/services/authorization'
import { getPerformanceDashboardData, PerformanceStats } from '@/app/actions/performance-actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { 
  Gauge, 
  Activity, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  Cpu
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Performans İzleme - Balkon Dergisi',
  robots: {
    index: false,
    follow: false
  }
}

export default async function PerformanceDashboardPage(
  props: {
    searchParams: Promise<{ days?: string }>
  }
) {
  const searchParams = await props.searchParams;
  // 1. Authenticate Admin
  let authContext
  try {
    authContext = await requireAdmin()
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthorizationError') {
      redirect('/admin/login')
    }
    throw error
  }

  const daysParam = searchParams.days ? parseInt(searchParams.days, 10) : 7
  const activeDays = [1, 7, 30].includes(daysParam) ? daysParam : 7

  // 2. Fetch metrics data via server action
  const result = await getPerformanceDashboardData(activeDays)

  const statsList: PerformanceStats[] = (result.success && result.data?.stats) || []
  const totalLogs = (result.success && result.data?.totalCount) || 0

  return (
    <main className="w-full min-h-screen bg-[#f9f9f9] pt-4 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href="/admin" 
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Yönetici Paneli</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>Giriş Yapan: {authContext.userEmail}</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-gray-200 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <Gauge className="w-8 h-8 text-red-600 animate-pulse" />
              Performans İzleme
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerçek kullanıcılardan toplanan Core Web Vitals metrikleri ve bütçe durumları.
            </p>
          </div>

          {/* Timeframe selector (dynamic query parameter) */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm w-fit self-start md:self-auto">
            <span className="text-xs font-semibold text-gray-400 px-2">Zaman Aralığı:</span>
            {[
              { label: 'Son 24 Saat', value: 1 },
              { label: 'Son 7 Gün', value: 7 },
              { label: 'Son 30 Gün', value: 30 }
            ].map((opt) => (
              <Link
                key={opt.value}
                href={`/admin/performance?days=${opt.value}`}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeDays === opt.value
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Error Fallback */}
        {!result.success && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-10 text-center mb-8">
            <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
            <h3 className="text-lg font-bold text-red-950">Metrikler Yüklenemedi</h3>
            <p className="text-sm text-red-700 mt-1 max-w-md">
              Veritabanından performans verileri sorgulanırken hata oluştu. Supabase veritabanında `performance_metrics` tablosunun kurulu olduğundan emin olun.
            </p>
          </div>
        )}

        {result.success && statsList.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm mb-8">
            <Clock className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800">Veri Bulunamadı</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              Seçilen zaman aralığında kaydedilmiş Web Vitals verisi bulunmuyor. Uygulamayı üretim ortamında ziyaret ettiğinizde veriler otomatik olarak kaydedilecektir.
            </p>
          </div>
        )}

        {result.success && statsList.length > 0 && (
          <>
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-red-50 rounded-xl text-red-600">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Toplam Rapor</span>
                  <span className="text-2xl font-bold text-gray-900">{totalLogs}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-xl text-green-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Durum</span>
                  <span className="text-lg font-bold text-green-700">Aktif ve İzleniyor</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Servis Çalışanı</span>
                  <span className="text-lg font-bold text-blue-700">Etkin (Offline Mod)</span>
                </div>
              </div>
            </div>

            {/* Core Web Vitals Status Cards */}
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-500" />
              Metrik Detayları ve Bütçeler
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Metric Details Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="font-bold text-gray-800">Metrik Analizleri</span>
                  <span className="text-xs text-gray-500">p75 Değeri Bütçeyi Belirler</span>
                </div>
                <div className="divide-y divide-gray-100 overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead>
                      <tr className="bg-gray-50/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        <th className="px-6 py-3">Metrik</th>
                        <th className="px-6 py-3">Örneklem</th>
                        <th className="px-6 py-3">Ortalama</th>
                        <th className="px-6 py-3">p75</th>
                        <th className="px-6 py-3">p95</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {statsList.map((stat) => {
                        const isExceeded = stat.budget > 0 && stat.p75 > stat.budget
                        return (
                          <tr key={stat.metric} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900">{stat.metric}</td>
                            <td className="px-6 py-4 text-xs font-medium text-gray-400">{stat.count} kayıt</td>
                            <td className="px-6 py-4 font-semibold text-gray-700">
                              {stat.avg.toFixed(2)}{stat.unit}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 font-bold ${
                                isExceeded ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {stat.p75.toFixed(2)}{stat.unit}
                                {isExceeded ? ' (Aşım)' : ''}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-500">
                              {stat.p95.toFixed(2)}{stat.unit}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Visual Budget Cards */}
              <div className="space-y-6">
                {statsList.map((stat) => {
                  const percent = stat.budget > 0 ? Math.min(100, (stat.p75 / stat.budget) * 100) : 0
                  const isExceeded = stat.budget > 0 && stat.p75 > stat.budget

                  return (
                    <div key={stat.metric} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-lg font-bold text-gray-900">{stat.metric}</span>
                          <span className="text-xs text-gray-400 block">
                            {stat.metric === 'LCP' && 'Largest Contentful Paint (İlk Büyük Resim Yüklemesi)'}
                            {stat.metric === 'FID' && 'First Input Delay (İlk Tıklama Gecikmesi)'}
                            {stat.metric === 'CLS' && 'Cumulative Layout Shift (Düzen Kayması)'}
                            {stat.metric === 'FCP' && 'First Contentful Paint (İlk İçerik Boyaması)'}
                            {stat.metric === 'TTFB' && 'Time to First Byte (Sunucu Yanıt Gecikmesi)'}
                            {stat.metric === 'INP' && 'Interaction to Next Paint (Etkileşim Gecikmesi)'}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          isExceeded 
                            ? 'bg-red-50 text-red-600 border border-red-200' 
                            : 'bg-green-50 text-green-600 border border-green-200'
                        }`}>
                          {isExceeded ? 'Kritik' : 'İyi'}
                        </span>
                      </div>

                      {/* Budget comparison progress bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-gray-500">
                          <span>Bütçe: {stat.budget}{stat.unit}</span>
                          <span>Mevcut (p75): {stat.p75.toFixed(2)}{stat.unit}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isExceeded ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>
          </>
        )}

        {/* Static Section: Caching Details and Server Info */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-red-500" />
            Önbellek ve Mobil Optimizasyon Politikaları
          </h3>
          <ul className="space-y-3 text-sm text-gray-600 divide-y divide-gray-100">
            <li className="pt-2 flex justify-between">
              <span className="font-semibold">Servis Çalışanı (Service Worker):</span>
              <span className="text-gray-500">Kritik JavaScript, CSS ve yazı tipleri için Cache-First stratejisi aktiftir.</span>
            </li>
            <li className="pt-3 flex justify-between">
              <span className="font-semibold">Dergi Sayfası Görselleri:</span>
              <span className="text-gray-500">Stale-While-Revalidate stratejisi ile 50MB LRU sınırlı görsel cache kullanılmaktadır.</span>
            </li>
            <li className="pt-3 flex justify-between">
              <span className="font-semibold">Bağlantı Duyarlı Kalite (Adaptive Quality):</span>
              <span className="text-gray-500">Mobil 3G/2G ağlarda görseller %60 kalitede, Wifi/4G&apos;de ise %90 kalitede yüklenir.</span>
            </li>
            <li className="pt-3 flex justify-between">
              <span className="font-semibold">PDF Eşzamanlı İşleme Limiti:</span>
              <span className="text-gray-500">Bellek taşmasını engellemek için eş zamanlı sayfa çizim işlemi en fazla 3 olarak kilitlenmiştir.</span>
            </li>
          </ul>
        </div>

      </div>
    </main>
  )
}
