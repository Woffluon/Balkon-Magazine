import { ProgressBar } from './ProgressBar'

interface UploadProgressProps {
  coverPct: number
  pagesPct: number
  overall: number
}

export function UploadProgress({ coverPct, pagesPct, overall }: UploadProgressProps) {
  return (
    <div className="grid gap-3 sm:gap-4">
      <ProgressBar value={coverPct} label="Kapak yükleme ilerlemesi" showPercentage={true} />
      
      <ProgressBar value={pagesPct} label="Sayfa yükleme ilerlemesi" showPercentage={true} />
      
      <div className="text-xs text-gray-600">
        <span>Toplam: %{Math.round(overall)}</span>
      </div>
    </div>
  )
}
