import { ProgressBar } from './ProgressBar'

interface UploadProgressProps {
  coverPct: number
  pagesPct: number
  overall: number
}

export function UploadProgress({ coverPct, pagesPct, overall }: UploadProgressProps) {
  return (
    <div className="grid gap-3 sm:gap-4">
      <div className="grid gap-2">
        <label className="text-xs sm:text-sm font-medium text-gray-700">Kapak</label>
        <ProgressBar value={coverPct} />
      </div>
      
      <div className="grid gap-2">
        <label className="text-xs sm:text-sm font-medium text-gray-700">Sayfalar</label>
        <ProgressBar value={pagesPct} />
      </div>
      
      <div className="text-xs text-gray-600">
        <span>Toplam: %{Math.round(overall)}</span>
      </div>
    </div>
  )
}
