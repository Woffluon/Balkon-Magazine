export default function DergiLoading() {
  return (
    <main className="w-full min-h-screen bg-[#f9f9f9]">
      <div className="responsive-container py-8 sm:py-12 lg:py-16">
        {/* Header Section Skeleton */}
        <div className="mb-8 sm:mb-12">
          <div className="text-center">
            {/* Title Skeleton */}
            <div className="h-8 sm:h-9 lg:h-10 w-64 sm:w-80 lg:w-96 mx-auto bg-gray-200 animate-pulse rounded-lg mb-4"></div>
            
            {/* Issue Badge Skeleton */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full border border-gray-200">
              <div className="h-5 w-16 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </div>
        </div>
        
        {/* Magazine Viewer Container Skeleton */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
          {/* Flipbook Viewer Skeleton */}
          <div className="flex flex-col items-center justify-center">
            {/* Main viewer area */}
            <div className="w-full max-w-4xl aspect-[3/2] bg-gray-100 animate-pulse rounded-lg mb-6 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4 opacity-30">📖</div>
                <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mx-auto mb-2"></div>
                <div className="h-4 w-64 bg-gray-200 animate-pulse rounded mx-auto"></div>
              </div>
            </div>
            
            {/* Controls Skeleton */}
            <div className="flex items-center justify-center gap-4">
              {/* Previous Button */}
              <div className="h-10 w-10 bg-gray-200 animate-pulse rounded-lg"></div>
              
              {/* Page Info */}
              <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
              
              {/* Next Button */}
              <div className="h-10 w-10 bg-gray-200 animate-pulse rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
