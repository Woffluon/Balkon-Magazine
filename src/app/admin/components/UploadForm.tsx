import { Input } from '@/components/ui/input'
import { ProgressBar } from './ProgressBar'

interface UploadFormProps {
  title: string
  issue: number | ''
  date: string
  coverPct: number
  pagesPct: number
  overall: number
  busy: boolean
  onTitleChange: (value: string) => void
  onIssueChange: (value: number) => void
  onDateChange: (value: string) => void
  onPdfChange: (file: File | null) => void
  onCoverChange: (file: File | null) => void
}

export function UploadForm({
  title,
  issue,
  date,
  coverPct,
  pagesPct,
  overall,
  busy,
  onTitleChange,
  onIssueChange,
  onDateChange,
  onPdfChange,
  onCoverChange
}: UploadFormProps) {
  return (
    <div className="grid gap-3 sm:gap-4">
      <div className="grid gap-2">
        <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="title">
          Başlık
        </label>
        <Input 
          id="title" 
          value={title} 
          onChange={(e) => onTitleChange(e.target.value)} 
          required 
          disabled={busy}
          className="w-full text-sm sm:text-base"
        />
      </div>
      
      <div className="grid gap-2">
        <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="issue">
          Sayı No
        </label>
        <Input 
          id="issue" 
          type="number" 
          value={issue} 
          onChange={(e) => onIssueChange(Number(e.target.value))} 
          required 
          disabled={busy}
          className="w-full text-sm sm:text-base"
        />
      </div>
      
      <div className="grid gap-2">
        <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="date">
          Yayın Tarihi
        </label>
        <Input 
          id="date" 
          type="date" 
          value={date} 
          onChange={(e) => onDateChange(e.target.value)} 
          required 
          disabled={busy}
          className="w-full text-sm sm:text-base"
        />
      </div>
      
      <div className="grid gap-2">
        <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="pdf">
          PDF <span className="text-xs text-gray-500">(yalnızca dönüştürmek için; sunucuya yüklenmez)</span>
        </label>
        <Input 
          id="pdf" 
          type="file" 
          accept="application/pdf" 
          onChange={(e) => onPdfChange(e.target.files?.[0] ?? null)} 
          required 
          disabled={busy}
          className="w-full text-xs sm:text-sm"
        />
      </div>
      
      <div className="grid gap-2">
        <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="cover">
          Kapak <span className="text-xs text-gray-500">(opsiyonel)</span>
        </label>
        <Input 
          id="cover" 
          type="file" 
          accept="image/*" 
          onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)} 
          disabled={busy}
          className="w-full text-xs sm:text-sm"
        />
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
