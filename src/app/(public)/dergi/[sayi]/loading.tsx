import FlipbookViewerSkeleton from '@/components/FlipbookViewerSkeleton'

export default function DergiLoading() {
  return (
    <main className="immersive-reader-container select-none">
      {/* Üst Floating Header İskeleti */}
      <header className="fixed top-0 left-0 w-full z-50 p-4 sm:p-6 pointer-events-none">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          {/* Breadcrumb İskeleti */}
          <div className="pointer-events-auto bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 shadow-2xl flex items-center gap-2.5">
            <div className="h-4 w-16 bg-white/20 rounded animate-pulse" />
            <span className="text-white/40 text-xs">/</span>
            <div className="h-4 w-28 bg-white/15 rounded animate-pulse" />
          </div>

          {/* Kırmızı Sayı Rozeti İskeleti */}
          <div className="pointer-events-auto bg-red-600/90 px-4 py-2 rounded-lg shadow-xl border border-red-500/80 flex items-center justify-center min-w-[76px] animate-pulse">
            <div className="h-3.5 w-14 bg-white/40 rounded" />
          </div>
        </div>
      </header>

      {/* Orta Ana Okuyucu Alanı (CSS Aspect Ratio ile Birebir Boyut) */}
      <div className="w-full flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="reader-aspect-ratio-box">
          <FlipbookViewerSkeleton />
        </div>
      </div>

      {/* Alt Floating Toolbar İskeleti (Yuvarlak Hap Şekilli) */}
      <div className="fixed bottom-6 z-50 px-4 w-full flex left-1/2 -translate-x-1/2 justify-center pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-3 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl px-6 py-3">
          <div className="w-5 h-5 rounded-full bg-white/15 animate-pulse" />
          <div className="h-6 w-20 sm:w-24 bg-white/10 rounded-md animate-pulse" />
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-white/15 animate-pulse" />
            <div className="h-4 w-8 bg-white/20 rounded text-center animate-pulse" />
            <div className="w-5 h-5 rounded-full bg-white/15 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Tiyatro Derinliği İçin Arkaplan Ambiyans Işıkları */}
      <div className="absolute inset-0 z-[-1] opacity-20 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-red-600/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full" />
      </div>
    </main>
  )
}
