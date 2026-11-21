import * as React from "react"
import { cn } from "@/lib/utils"

export interface EmptyProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

/**
 * Reusable empty-state surface aligned with Polaris/Carbon patterns and semantic admin tokens.
 */
function Empty({
  icon,
  title,
  description,
  action,
  children,
  className,
  ...props
}: EmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-card-foreground sm:px-10 sm:py-12",
        className
      )}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="mb-4 inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground [&_svg]:size-6"
        >
          {icon}
        </div>
      ) : null}

      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>

      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}

      {action || children ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
          {children}
        </div>
      ) : null}
    </div>
  )
}

export { Empty }
