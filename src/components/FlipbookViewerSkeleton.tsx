export default function FlipbookViewerSkeleton() {
  return (
    <div 
      className="relative w-full flex justify-center items-center overflow-hidden h-[700px]"
      role="status"
      aria-live="polite"
      aria-label="Dergi yükleniyor"
    >
      {/* Book-shaped skeleton */}
      <div className="relative flex items-center justify-center">
        {/* Left page */}
        <div className="w-[250px] h-[350px] sm:w-[300px] sm:h-[420px] md:w-[350px] md:h-[490px] bg-gradient-to-br from-gray-200 to-gray-300 rounded-l-lg shadow-lg animate-pulse" />
        
        {/* Center divider (book spine) */}
        <div className="w-1 h-[350px] sm:h-[420px] md:h-[490px] bg-gray-400" />
        
        {/* Right page */}
        <div className="w-[250px] h-[350px] sm:w-[300px] sm:h-[420px] md:w-[350px] md:h-[490px] bg-gradient-to-br from-gray-200 to-gray-300 rounded-r-lg shadow-lg animate-pulse" />
      </div>

      {/* Animated spinner with loading text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative">
          {/* Spinner */}
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
        
        {/* Loading text */}
        <p className="mt-4 text-sm font-medium text-gray-600">
          Dergi yükleniyor...
        </p>
      </div>
    </div>
  )
}
