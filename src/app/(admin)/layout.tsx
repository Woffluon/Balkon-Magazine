import { Suspense, type ReactNode } from 'react'
import { getOptionalAuth } from '@/lib/middleware/authMiddleware'
import { AdminThemeProvider } from '@/components/admin/AdminThemeProvider'
import { AdminTourProvider } from '@/components/admin/tour/AdminTourProvider'
import { AdminShell } from '@/components/admin/AdminShell'

/**
 * Shared loading skeleton for admin pages matching semantic admin tokens.
 */
function AdminLoading() {
  return (
    <div className="w-full py-6 sm:py-8">
      <div className="responsive-container">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Layout for all `/admin*` routes providing isolated theme scope, shared shell,
 * and Suspense boundary without requiring `ReactQueryProvider`.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getOptionalAuth().catch(() => null)
  const userEmail = user?.email ?? ''

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground antialiased">
      <AdminThemeProvider>
        <AdminTourProvider userEmail={userEmail}>
          <AdminShell userEmail={userEmail}>
            <Suspense fallback={<AdminLoading />}>
              {children}
            </Suspense>
          </AdminShell>
        </AdminTourProvider>
      </AdminThemeProvider>
    </div>
  )
}
