interface ProgressBarProps {
  value: number
  label: string
  showPercentage?: boolean
  fileCount?: { done: number; total: number }
}

export function ProgressBar({ value, label, showPercentage = true, fileCount }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)))
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] sm:text-xs text-gray-600">{label}</span>
        {showPercentage && (
          <span className="text-[10px] sm:text-xs text-gray-600 font-medium">
            {fileCount ? `${fileCount.done} / ${fileCount.total} (% ${pct})` : `% ${pct}`}
          </span>
        )}
      </div>
      <div 
        className="w-full h-2 rounded bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-2 bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
