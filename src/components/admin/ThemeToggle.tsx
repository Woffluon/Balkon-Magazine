'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminTheme } from '@/components/admin/AdminThemeProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

/**
 * Accessible button that switches the isolated admin panel between light and dark themes.
 */
export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useAdminTheme()
  const isDark = theme === 'dark'
  const actionLabel = isDark ? t('theme.switchToLight') : t('theme.switchToDark')
  const modeLabel = isDark ? t('theme.light') : t('theme.dark')

  return (
    <Button
      type="button"
      variant="outline"
      onClick={toggleTheme}
      data-tour="theme-toggle"
      aria-label={actionLabel}
      aria-pressed={isDark}
      title={actionLabel}
      className={cn('min-h-9 min-w-9 px-2.5 sm:px-3', className)}
    >
      {isDark ? (
        <Sun className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <Moon className="size-4 shrink-0" aria-hidden="true" />
      )}
      <span className={cn('text-xs font-medium', showLabel ? 'inline' : 'hidden md:inline')}>
        {modeLabel}
      </span>
    </Button>
  )
}
