import { getAuthenticatedClient } from '@/lib/supabase/server'
import { getAnalyticsDashboardData } from '@/app/actions/analytics-actions'
import { DynamicAnalyticsDashboard } from '@/lib/dynamic-imports'
import { logger } from '@/lib/services/Logger'
import { requireAdmin } from '@/lib/services/authorization'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
    title: 'İstatistikler - Balkon Dergisi',
    robots: {
        index: false,
        follow: false,
    },
}

export default async function AnalyticsPage() {
    let authContext: Awaited<ReturnType<typeof requireAdmin>>

    try {
        authContext = await requireAdmin()
    } catch (error) {
        if (error instanceof Error && error.name === 'AuthorizationError') {
            redirect('/admin/login')
        }
        throw error
    }
    const supabase = await getAuthenticatedClient()
    const userEmail = authContext.userEmail

    // Fetch all magazines for the filter dropdown
    const { data: magazines } = await supabase
        .from('magazines')
        .select('id, title, issue_number')
        .order('issue_number', { ascending: false })

    // Fetch initial analytics data (last 30 days)
    const result = await getAnalyticsDashboardData(30)

    if (!result.success) {
        if (result.error.code !== 'UNAUTHORIZED') {
            logger.error('Failed to fetch analytics data in admin page', {
                page: 'admin/analytics/page',
                userId: authContext.userId,
                userEmail,
                error: result.error,
            })
        }

        return (
            <main className="w-full min-h-screen bg-[#f9f9f9] pt-4">
                <div className="responsive-container py-6 sm:py-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900">İstatistikler</h1>
                    </div>

                    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
                        <div className="mb-2 text-xl font-semibold text-red-900">
                            {result.error.userMessage || 'Bir hata oluştu'}
                        </div>
                        <p className="mb-6 max-w-md text-sm text-red-700">
                            İstatistik verileri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
                        </p>
                        <div className="flex gap-3">
                            <a
                                href="/admin/analytics"
                                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                                Sayfayı Yenile
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <DynamicAnalyticsDashboard
            initialData={result.data}
            userEmail={userEmail}
            magazines={magazines || []}
        />
    )
}
