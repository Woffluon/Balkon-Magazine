import { t } from '@/lib/i18n'

export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-label={t('common.loading')}
      className="responsive-container py-6 sm:py-8"
    >
      {/* Header Section Skeleton */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-muted motion-reduce:animate-none sm:w-56" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted motion-reduce:animate-none sm:w-80" />
        </div>
        <div className="h-9 w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none sm:w-40" />
      </div>

      {/* Table Card Container Skeleton */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Filter Toolbar Skeleton */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="h-9 w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none sm:w-72" />
            <div className="h-9 w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none sm:w-44" />
            <div className="h-9 w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none sm:w-36" />
          </div>
          <div className="h-4 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>

        {/* Desktop Table Header Skeleton */}
        <div className="hidden border-b border-border bg-muted/50 px-6 py-3 sm:block">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-1 h-4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="col-span-4 h-4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="col-span-2 h-4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="col-span-1 h-4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="col-span-2 h-4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="col-span-2 h-4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="px-4 py-4 sm:px-6">
              {/* Mobile Card Skeleton */}
              <div className="space-y-3 sm:hidden">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
                </div>
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                <div className="h-10 w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
              </div>

              {/* Desktop Row Skeleton */}
              <div className="hidden grid-cols-12 items-center gap-4 sm:grid">
                <div className="col-span-1">
                  <div className="h-4 w-8 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                </div>
                <div className="col-span-4">
                  <div className="h-4 w-4/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                </div>
                <div className="col-span-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                </div>
                <div className="col-span-1">
                  <div className="h-4 w-10 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                </div>
                <div className="col-span-2">
                  <div className="h-6 w-20 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <div className="h-9 w-24 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
