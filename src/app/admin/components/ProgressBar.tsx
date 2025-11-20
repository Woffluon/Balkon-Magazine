interface ProgressBarProps {
  value: number
}

export function ProgressBar({ value }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className="w-full h-2 rounded bg-muted overflow-hidden">
      <div className="h-2 bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}
