'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
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
const themeListeners = new Set<() => void>()
let fallbackTheme: AdminTheme | null = null

function notifyThemeListeners(): void {
  themeListeners.forEach((listener) => listener())
}

function readStoredTheme(): AdminTheme {
  if (fallbackTheme !== null) {
    return fallbackTheme
  }
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
    fallbackTheme = null
  } catch {
    // Fall back to in-memory theme when storage writes fail (e.g., private browsing restrictions)
    fallbackTheme = theme
  }
}

function subscribeToTheme(onStoreChange: () => void): () => void {
  themeListeners.add(onStoreChange)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ADMIN_THEME_STORAGE_KEY) {
      fallbackTheme = null
      onStoreChange()
    }
  }
  window.addEventListener('storage', handleStorage)

  return () => {
    themeListeners.delete(onStoreChange)
    window.removeEventListener('storage', handleStorage)
  }
}

function getServerThemeSnapshot(): AdminTheme {
  return 'light'
}

/**
 * Provides isolated light/dark theme state for `/admin*` routes and synchronizes
 * `admin-theme` and `dark` classes on `document.documentElement` so portals and
 * root Toaster inherit admin tokens without affecting public pages.
 */
export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readStoredTheme,
    getServerThemeSnapshot
  )
  const isAdminRoute = Boolean(pathname?.startsWith('/admin'))

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
    persistTheme(nextTheme)
    notifyThemeListeners()
  }, [])

  const toggleTheme = useCallback(() => {
    const next: AdminTheme = readStoredTheme() === 'dark' ? 'light' : 'dark'
    persistTheme(next)
    notifyThemeListeners()
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
