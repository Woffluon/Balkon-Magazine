'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'

export type AdminTheme = 'light' | 'dark'

export interface AdminThemeContextValue {
  theme: AdminTheme
  setTheme: (theme: AdminTheme) => void
  toggleTheme: () => void
}

const ADMIN_THEME_STORAGE_KEY = 'balkon_admin_theme'

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null)

function readStoredTheme(): AdminTheme {
  try {
    const saved = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)
    return saved === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function persistTheme(theme: AdminTheme): void {
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore storage write failures (e.g., private browsing restrictions)
  }
}

/**
 * Provides isolated light/dark theme state for `/admin*` routes and synchronizes
 * `admin-theme` and `dark` classes on `document.documentElement` so portals and
 * root Toaster inherit admin tokens without affecting public pages.
 */
export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [theme, setThemeState] = useState<AdminTheme>('light')
  const isAdminRoute = Boolean(pathname?.startsWith('/admin'))

  useEffect(() => {
    setThemeState(readStoredTheme())
  }, [])

  useEffect(() => {
    const root = document.documentElement

    if (isAdminRoute) {
      root.classList.add('admin-theme')
      if (theme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    } else {
      root.classList.remove('admin-theme', 'dark')
    }

    return () => {
      root.classList.remove('admin-theme', 'dark')
    }
  }, [isAdminRoute, theme])

  const setTheme = useCallback((nextTheme: AdminTheme) => {
    setThemeState(nextTheme)
    persistTheme(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: AdminTheme = prev === 'dark' ? 'light' : 'dark'
      persistTheme(next)
      return next
    })
  }, [])

  const value = useMemo<AdminThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  )

  return (
    <AdminThemeContext.Provider value={value}>
      {children}
    </AdminThemeContext.Provider>
  )
}

/**
 * Returns the isolated admin theme state and controls.
 */
export function useAdminTheme(): AdminThemeContextValue {
  const context = useContext(AdminThemeContext)
  if (!context) {
    throw new Error('useAdminTheme must be used within AdminThemeProvider')
  }
  return context
}
