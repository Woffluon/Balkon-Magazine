import { formatNumberTR } from '@/lib/formatters/tr'

interface ProgressBarProps {
  value: number
  label: string
  showPercentage?: boolean
  fileCount?: { done: number; total: number }
}

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  fileCount,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)))

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {showPercentage && (
          <span className="text-xs font-medium text-foreground tabular-nums">
            {fileCount
              ? `${formatNumberTR(fileCount.done)} / ${formatNumberTR(fileCount.total)} (% ${formatNumberTR(pct)})`
              : `% ${formatNumberTR(pct)}`}
          </span>
        )}
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-2 bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
