export default function AdminLoading() {
  return (
    <main className="w-full min-h-screen bg-[#f9f9f9] pt-4">
      <div className="responsive-container py-6 sm:py-8">
        {/* Header Section Skeleton */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          {/* Title Skeleton */}
          <div className="h-9 sm:h-10 lg:h-11 w-48 sm:w-56 bg-gray-200 animate-pulse rounded-lg"></div>
          
          {/* Action Buttons Skeleton */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* User Menu Skeleton */}
            <div className="h-10 w-full sm:w-32 bg-gray-200 animate-pulse rounded-lg"></div>
            {/* Upload Button Skeleton */}
            <div className="h-10 w-full sm:w-36 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>
        </div>

        {/* Table Container Skeleton */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Table Header Skeleton */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-1 h-5 bg-gray-200 animate-pulse rounded"></div>
              <div className="col-span-5 h-5 bg-gray-200 animate-pulse rounded"></div>
              <div className="col-span-2 h-5 bg-gray-200 animate-pulse rounded"></div>
              <div className="col-span-2 h-5 bg-gray-200 animate-pulse rounded"></div>
              <div className="col-span-2 h-5 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </div>

          {/* Table Rows Skeleton */}
          <div className="divide-y divide-gray-200">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-6 py-4">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Issue Number */}
                  <div className="col-span-1">
                    <div className="h-6 w-8 bg-gray-100 animate-pulse rounded"></div>
                  </div>
                  {/* Title */}
                  <div className="col-span-5">
                    <div className="h-5 bg-gray-100 animate-pulse rounded w-3/4"></div>
                  </div>
                  {/* Date */}
                  <div className="col-span-2">
                    <div className="h-5 bg-gray-100 animate-pulse rounded w-24"></div>
                  </div>
                  {/* Status */}
                  <div className="col-span-2">
                    <div className="h-6 w-20 bg-gray-100 animate-pulse rounded-full"></div>
                  </div>
                  {/* Actions */}
                  <div className="col-span-2">
                    <div className="h-8 w-8 bg-gray-100 animate-pulse rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
