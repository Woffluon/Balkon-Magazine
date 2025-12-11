import { ProgressBar } from './ProgressBar'

interface UploadProgressProps {
  coverProgress: number
  pagesProgress: number
  overall: number
}

export function UploadProgress({ coverProgress, pagesProgress, overall }: UploadProgressProps) {
  return (
    <div className="grid gap-3 sm:gap-4">
      <ProgressBar value={coverProgress} label="Kapak yükleme ilerlemesi" showPercentage={true} />
      
      <ProgressBar value={pagesProgress} label="Sayfa yükleme ilerlemesi" showPercentage={true} />
      
      <div className="text-xs text-gray-600">
        <span>Toplam: %{Math.round(overall)}</span>
      </div>
    </div>
  )
}
