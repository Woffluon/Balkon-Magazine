'use client'

import { createContext, useContext } from 'react'
import type { TourPageKey } from '@/lib/tour/steps'

export type { TourPageKey }

export interface UseAdminTourReturn {
  startMainTour: () => void
  restartTour: () => void
  startPageTour: (page: TourPageKey) => void
  openHelpDrawer: () => void
  closeHelpDrawer: () => void
  isHelpDrawerOpen: boolean
  isTourActive: boolean
  hasCompletedMainTour: boolean
}

export const AdminTourContext = createContext<UseAdminTourReturn | null>(null)

/**
 * Returns interactive tour and Help Drawer controls provided by `AdminTourProvider`.
 */
export function useAdminTour(): UseAdminTourReturn {
  const context = useContext(AdminTourContext)
  if (!context) {
    throw new Error('useAdminTour must be used within AdminTourProvider')
  }
  return context
}
