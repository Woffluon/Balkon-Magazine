import { Suspense, ReactNode } from 'react'

/**
 * Loading component for admin pages
 */
function AdminLoading() {
  return (
    <main className="w-full min-h-screen bg-[#f9f9f9] pt-4">
      <div className="responsive-container py-6 sm:py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 w-48 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

/**
 * Layout for admin pages
 * 
 * This layout wraps all admin routes including:
 * - Admin dashboard
 * - Admin login
 * 
 * Features:
 * - Suspense boundary with loading state
 * - Consistent admin styling
 * 
 * Requirements: 15.3, 15.4
 */
export default function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/40">
      <Suspense fallback={<AdminLoading />}>
        {children}
      </Suspense>
    </div>
  )
}
