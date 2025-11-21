export default function AdminLoading() {
  return (
    <main className="w-full min-h-screen bg-[#f9f9f9] pt-4">
      <div className="responsive-container py-6 sm:py-8">
        {/* Header with title and buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          {/* Title skeleton */}
          <div className="h-8 sm:h-9 lg:h-10 w-48 sm:w-56 lg:w-64 bg-gray-200 rounded-lg animate-pulse" />
          
          {/* Buttons skeleton */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* User menu skeleton */}
            <div className="h-10 w-full sm:w-32 bg-gray-200 rounded-md animate-pulse" />
            {/* Upload button skeleton */}
            <div className="h-10 w-full sm:w-36 bg-gray-200 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Table container */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6">
            {/* Search and count row */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search input skeleton */}
              <div className="h-10 w-full sm:max-w-xs bg-gray-200 rounded-md animate-pulse" />
              {/* Count text skeleton */}
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>

            {/* Table skeleton */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                {/* Table header */}
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="pb-3 text-left">
                      <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                    </th>
                    <th className="pb-3 text-left">
                      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    </th>
                    <th className="pb-3 text-left">
                      <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
                    </th>
                    <th className="pb-3 text-left">
                      <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                    </th>
                  </tr>
                </thead>

                {/* Table rows */}
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-4">
                        <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="py-4">
                        <div className="h-5 w-40 sm:w-56 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="py-4">
                        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="py-4">
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
