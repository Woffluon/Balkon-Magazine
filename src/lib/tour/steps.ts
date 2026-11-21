import type { Alignment, DriveStep, Side } from 'driver.js'
import { t } from '@/lib/i18n'

export type TourPageKey = 'dashboard' | 'analytics' | 'performance' | 'upload'

export interface TourStepDefinition {
  id: string
  selector?: string
  fallbackSelector?: string
  title: string
  description: string
  side?: Side | 'over'
  align?: Alignment
}

function isElementVisible(element: Element): boolean {
  if (!element.isConnected) {
    return false
  }
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function findVisibleTarget(selector: string): Element | undefined {
  const candidates = document.querySelectorAll(selector)
  for (const candidate of candidates) {
    if (isElementVisible(candidate)) {
      return candidate
    }
  }
  return undefined
}

/**
 * Resolves tour definitions against the live DOM and silently omits steps whose
 * target selectors are missing or hidden (e.g., collapsed mobile sidebar or empty table).
 */
export function resolveAvailableTourSteps(definitions: TourStepDefinition[]): DriveStep[] {
  const resolved: DriveStep[] = []

  for (const definition of definitions) {
    let targetElement: Element | undefined

    if (definition.selector) {
      targetElement = findVisibleTarget(definition.selector)
      if (!targetElement && definition.fallbackSelector) {
        targetElement = findVisibleTarget(definition.fallbackSelector)
      }
      if (!targetElement) {
        continue
      }
    }

    const popoverConfig: NonNullable<DriveStep['popover']> = {
      title: definition.title,
      description: definition.description,
    }

    if (definition.side && definition.side !== 'over') {
      popoverConfig.side = definition.side
    }
    if (definition.align) {
      popoverConfig.align = definition.align
    }

    resolved.push({
      ...(targetElement ? { element: targetElement } : {}),
      popover: popoverConfig,
    })
  }

  return resolved
}

/**
 * Returns the 9-step primary onboarding tour covering shell controls and core dashboard tasks.
 */
export function getMainTourStepDefinitions(): TourStepDefinition[] {
  const hasMagazinesOnScreen =
    typeof document !== 'undefined' && Boolean(findVisibleTarget('[data-tour="magazine-table"]'))

  const completionDescription = hasMagazinesOnScreen
    ? t('tour.steps.completeCta.descriptionWithItems')
    : t('tour.steps.completeCta.descriptionEmpty')

  return [
    {
      id: 'welcome',
      title: t('tour.steps.welcome.title'),
      description: t('tour.steps.welcome.description'),
      side: 'over',
      align: 'center',
    },
    {
      id: 'sidebar',
      selector: '[data-tour="admin-sidebar"]',
      title: t('tour.steps.sidebar.title'),
      description: t('tour.steps.sidebar.description'),
      side: 'right',
      align: 'start',
    },
    {
      id: 'theme',
      selector: '[data-tour="theme-toggle"]',
      title: t('tour.steps.theme.title'),
      description: t('tour.steps.theme.description'),
      side: 'bottom',
      align: 'end',
    },
    {
      id: 'guide',
      selector: '[data-tour="guide-trigger"]',
      title: t('tour.steps.guide.title'),
      description: t('tour.steps.guide.description'),
      side: 'bottom',
      align: 'end',
    },
    {
      id: 'user-menu',
      selector: '[data-tour="user-menu"]',
      title: t('tour.steps.userMenu.title'),
      description: t('tour.steps.userMenu.description'),
      side: 'bottom',
      align: 'end',
    },
    {
      id: 'upload-btn',
      selector: '[data-tour="upload-trigger"]',
      title: t('tour.steps.uploadBtn.title'),
      description: t('tour.steps.uploadBtn.description'),
      side: 'bottom',
      align: 'end',
    },
    {
      id: 'search',
      selector: '[data-tour="magazine-search"]',
      title: t('tour.steps.search.title'),
      description: t('tour.steps.search.description'),
      side: 'bottom',
      align: 'start',
    },
    {
      id: 'table-actions',
      selector: '[data-tour="row-actions"]',
      fallbackSelector: '[data-tour="magazine-table"]',
      title: t('tour.steps.tableActions.title'),
      description: t('tour.steps.tableActions.description'),
      side: 'left',
      align: 'start',
    },
    {
      id: 'complete-cta',
      title: t('tour.steps.completeCta.title'),
      description: completionDescription,
      side: 'over',
      align: 'center',
    },
  ]
}

/**
 * Returns page-specific mini tour definitions for sub-pages or contextual help triggers.
 */
export function getPageTourStepDefinitions(page: TourPageKey): TourStepDefinition[] {
  switch (page) {
    case 'analytics':
      return [
        {
          id: 'analytics-filters',
          selector: '[data-tour="analytics-filters"]',
          title: t('tour.steps.analyticsFilters.title'),
          description: t('tour.steps.analyticsFilters.description'),
          side: 'bottom',
          align: 'start',
        },
        {
          id: 'analytics-kpis',
          selector: '[data-tour="analytics-kpis"]',
          title: t('tour.steps.analyticsKpis.title'),
          description: t('tour.steps.analyticsKpis.description'),
          side: 'bottom',
          align: 'center',
        },
        {
          id: 'analytics-charts',
          selector: '[data-tour="analytics-charts"]',
          title: t('tour.steps.analyticsCharts.title'),
          description: t('tour.steps.analyticsCharts.description'),
          side: 'top',
          align: 'center',
        },
      ]

    case 'performance':
      return [
        {
          id: 'performance-ranges',
          selector: '[data-tour="performance-ranges"]',
          title: t('tour.steps.performanceRanges.title'),
          description: t('tour.steps.performanceRanges.description'),
          side: 'bottom',
          align: 'start',
        },
        {
          id: 'performance-budgets',
          selector: '[data-tour="performance-budgets"]',
          title: t('tour.steps.performanceBudgets.title'),
          description: t('tour.steps.performanceBudgets.description'),
          side: 'top',
          align: 'center',
        },
      ]

    case 'upload':
      return [
        {
          id: 'upload-trigger',
          selector: '[data-tour="upload-trigger"]',
          title: t('tour.steps.uploadBtn.title'),
          description: t('tour.steps.uploadBtn.description'),
          side: 'bottom',
          align: 'end',
        },
        {
          id: 'upload-workflow',
          title: t('tour.steps.uploadWorkflow.title'),
          description: t('tour.steps.uploadWorkflow.description'),
          side: 'over',
          align: 'center',
        },
      ]

    case 'dashboard':
    default:
      return [
        {
          id: 'dashboard-upload',
          selector: '[data-tour="upload-trigger"]',
          title: t('tour.steps.uploadBtn.title'),
          description: t('tour.steps.uploadBtn.description'),
          side: 'bottom',
          align: 'end',
        },
        {
          id: 'dashboard-search',
          selector: '[data-tour="magazine-search"]',
          title: t('tour.steps.search.title'),
          description: t('tour.steps.search.description'),
          side: 'bottom',
          align: 'start',
        },
        {
          id: 'dashboard-table',
          selector: '[data-tour="magazine-table"]',
          title: t('tour.steps.dashboardTable.title'),
          description: t('tour.steps.dashboardTable.description'),
          side: 'top',
          align: 'center',
        },
        {
          id: 'dashboard-row-actions',
          selector: '[data-tour="row-actions"]',
          title: t('tour.steps.tableActions.title'),
          description: t('tour.steps.tableActions.description'),
          side: 'left',
          align: 'start',
        },
      ]
  }
}

/**
 * Maps the current admin pathname to its corresponding page mini-tour key.
 */
export function resolvePageKeyFromPathname(pathname: string | null): TourPageKey {
  if (!pathname) {
    return 'dashboard'
  }
  if (pathname.startsWith('/admin/analytics')) {
    return 'analytics'
  }
  if (pathname.startsWith('/admin/performance')) {
    return 'performance'
  }
  return 'dashboard'
}
