export default function FlipbookViewerSkeleton() {
  return (
    <div
      className="w-full h-full relative overflow-hidden select-none bg-[#15181e] rounded-sm shadow-2xl border border-white/[0.06]"
      role="status"
      aria-live="polite"
      aria-label="Dergi yükleniyor"
    >
      {/* Koyu Pürüzsüz Shimmer Parıltısı */}
      <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="w-full h-full animate-reader-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      </div>

      {/* Açık Dergi Sayfa Alanı (Mobilde Tek Sayfa, Masaüstünde Çift Sayfa) */}
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 relative" aria-hidden="true">
        {/* Sol Sayfa (Desktop: Sol Sayfa | Mobil: Tek Sayfa) */}
        <div className="relative w-full h-full bg-[#181b22] p-6 sm:p-10 lg:p-12 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_24px_rgba(0,0,0,0.6)] lg:shadow-[inset_4px_0_16px_rgba(0,0,0,0.4),inset_-16px_0_24px_-8px_rgba(0,0,0,0.7)] border-r-0 lg:border-r lg:border-black/50">
          {/* Sayfa yaprak kenar gölgesi */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/30 pointer-events-none" />

          {/* Üst Kategori & Başlık İskeleti */}
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-2.5 w-20 bg-white/10 rounded-sm animate-pulse" />
              <div className="h-2.5 w-10 bg-white/10 rounded-sm animate-pulse" />
            </div>
            <div className="h-5 sm:h-7 w-4/5 bg-white/10 rounded-sm animate-pulse mt-4" />
            <div className="h-3.5 w-1/2 bg-white/[0.06] rounded-sm animate-pulse" />
          </div>

          {/* Orta Görsel Bloğu & İçerik İskeleti */}
          <div className="relative z-10 my-auto py-4 space-y-4">
            <div className="w-full aspect-[4/3] bg-white/[0.04] rounded-sm border border-white/[0.05] p-3 flex flex-col justify-end relative overflow-hidden">
              <div className="w-full h-full absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="h-2.5 w-1/3 bg-white/10 rounded-sm z-10" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-2 w-full bg-white/[0.06] rounded-sm" />
              <div className="h-2 w-11/12 bg-white/[0.06] rounded-sm" />
              <div className="h-2 w-4/5 bg-white/[0.06] rounded-sm" />
            </div>
          </div>

          {/* Alt Sayfa Numarası */}
          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/[0.06]">
            <div className="h-2 w-20 bg-white/[0.08] rounded-sm" />
            <div className="h-2.5 w-4 bg-white/15 rounded-sm" />
          </div>
        </div>

        {/* Sağ Sayfa (Desktop Only: Çift Açık Sayfa İskeleti) */}
        <div className="hidden lg:flex relative w-full h-full bg-[#171a20] p-12 flex-col justify-between overflow-hidden shadow-[inset_16px_0_24px_-8px_rgba(0,0,0,0.7),inset_-4px_0_16px_rgba(0,0,0,0.4)]">
          {/* Sağ Sayfa derinlik gradyanı */}
          <div className="absolute inset-0 bg-gradient-to-l from-black/20 via-transparent to-black/30 pointer-events-none" />

          {/* Üst Başlık */}
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-2.5 w-12 bg-white/10 rounded-sm animate-pulse" />
              <div className="h-2.5 w-24 bg-white/10 rounded-sm animate-pulse" />
            </div>
            <div className="h-4 w-3/5 bg-white/[0.07] rounded-sm animate-pulse mt-5" />
          </div>

          {/* İki Sütunlu Editoryal Metin Düzeni */}
          <div className="relative z-10 my-auto py-5 grid grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <div className="h-2.5 w-3/4 bg-white/10 rounded-sm mb-3" />
              <div className="h-2 w-full bg-white/[0.06] rounded-sm" />
              <div className="h-2 w-full bg-white/[0.06] rounded-sm" />
              <div className="h-2 w-5/6 bg-white/[0.06] rounded-sm" />
              <div className="h-2 w-full bg-white/[0.06] rounded-sm" />
              <div className="h-2 w-4/5 bg-white/[0.06] rounded-sm" />
            </div>
            <div className="space-y-2.5">
              <div className="h-2 w-full bg-white/[0.06] rounded-sm" />
              <div className="h-2 w-11/12 bg-white/[0.06] rounded-sm" />
              <div className="h-14 w-full bg-white/[0.03] rounded-sm border-l-2 border-white/20 p-2 mt-2 flex items-center">
                <div className="h-2 w-4/5 bg-white/[0.08] rounded-sm" />
              </div>
              <div className="h-2 w-full bg-white/[0.06] rounded-sm" />
              <div className="h-2 w-3/4 bg-white/[0.06] rounded-sm" />
            </div>
          </div>

          {/* Alt Sayfa Numarası */}
          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/[0.06]">
            <div className="h-2.5 w-4 bg-white/15 rounded-sm" />
            <div className="h-2 w-24 bg-white/[0.08] rounded-sm" />
          </div>
        </div>
      </div>

      {/* Orta Dikiş / Katlanma Çizgisi ve Sırt Gölgesi (Desktop: Center Fold / Spine Crease) */}
      <div className="hidden lg:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-black/40 z-20 pointer-events-none shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
      <div className="hidden lg:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-10 bg-gradient-to-r from-black/40 via-black/10 to-black/40 pointer-events-none z-10" />
    </div>
  )
}
