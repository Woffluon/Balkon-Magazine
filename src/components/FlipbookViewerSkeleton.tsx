export default function FlipbookViewerSkeleton() {
  return (
    <div
      className="reader-aspect-ratio-box bg-neutral-900 border-none shadow-none flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Dergi yükleniyor"
    >
      <div className="flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
        <p className="mt-4 text-sm font-medium text-white/40 tracking-widest uppercase">
          Yükleniyor...
        </p>
      </div>
    </div>
  )
}
