'use client'

import 'driver.js/dist/driver.css'
import '@/components/admin/tour/driver-theme.css'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import type { Config, DestroyReason, Driver } from 'driver.js'
import { HelpDrawer } from '@/components/admin/tour/HelpDrawer'
import {
  AdminTourContext,
  type TourPageKey,
  type UseAdminTourReturn,
} from '@/hooks/useAdminTour'
import { t } from '@/lib/i18n'
import {
  getMainTourStepDefinitions,
  getPageTourStepDefinitions,
  resolveAvailableTourSteps,
  type TourStepDefinition,
} from '@/lib/tour/steps'

export interface AdminTourProviderProps {
  userEmail?: string
  children: ReactNode
}

type TourCompletionStatus = 'completed' | 'dismissed'

interface ActiveTourMeta {
  kind: 'main' | 'page'
  storageKey: string
}

const MAIN_TOUR_PREFIX = 'balkon_admin_tour_v1'
const PAGE_TOUR_PREFIX = 'balkon_admin_tour_page_v1'

function normalizeUserKey(userEmail?: string): string {
  const trimmed = userEmail?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'anon'
}

function getMainStorageKey(userKey: string): string {
  return `${MAIN_TOUR_PREFIX}:${userKey}`
}

function getPageStorageKey(userKey: string, page: TourPageKey): string {
  return `${PAGE_TOUR_PREFIX}:${userKey}:${page}`
}

function readTourStatus(storageKey: string): TourCompletionStatus | null {
  try {
    const value = window.localStorage.getItem(storageKey)
    if (value === 'completed' || value === 'dismissed') {
      return value
    }
    return null
  } catch {
    return null
  }
}

function persistTourStatus(storageKey: string, status: TourCompletionStatus): void {
  try {
    window.localStorage.setItem(storageKey, status)
  } catch {
    // Ignore storage failures in restricted/private browser contexts
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isDarkAdminThemeActive(): boolean {
  if (typeof document === 'undefined') {
    return false
  }
  const root = document.documentElement
  return root.classList.contains('admin-theme') && root.classList.contains('dark')
}

function isLoginPath(pathname: string | null): boolean {
  return pathname === '/admin/login' || Boolean(pathname?.startsWith('/admin/login/'))
}

function getGuideTriggerElement(): HTMLElement | null {
  const trigger = document.querySelector('[data-tour="guide-trigger"]')
  return trigger instanceof HTMLElement ? trigger : null
}

/**
 * Provides lazy-loaded `driver.js` onboarding tours, per-user completion persistence,
 * reduced-motion/keyboard accessibility handling, and the contextual `HelpDrawer`.
 */
export function AdminTourProvider({
  userEmail,
  children,
}: AdminTourProviderProps): React.JSX.Element {
  const pathname = usePathname()
  const userKey = normalizeUserKey(userEmail)
  const mainStorageKey = getMainStorageKey(userKey)
  const loginRoute = isLoginPath(pathname)

  const [isHelpDrawerOpen, setIsHelpDrawerOpen] = useState(false)
  const [isTourActive, setIsTourActive] = useState(false)
  const [hasCompletedMainTour, setHasCompletedMainTour] = useState(false)
  const [liveAnnouncement, setLiveAnnouncement] = useState('')

  const driverRef = useRef<Driver | null>(null)
  const activeMetaRef = useRef<ActiveTourMeta | null>(null)
  const runIdRef = useRef(0)
  const pendingLaunchTimeoutRef = useRef<number | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const isHelpDrawerOpenRef = useRef(false)
  const pathnameRef = useRef(pathname)

  isHelpDrawerOpenRef.current = isHelpDrawerOpen
  pathnameRef.current = pathname

  const clearPendingLaunch = useCallback(() => {
    if (pendingLaunchTimeoutRef.current !== null) {
      window.clearTimeout(pendingLaunchTimeoutRef.current)
      pendingLaunchTimeoutRef.current = null
    }
  }, [])

  const destroyActiveDriver = useCallback(() => {
    runIdRef.current += 1
    clearPendingLaunch()
    if (driverRef.current) {
      driverRef.current.destroy()
      driverRef.current = null
    }
    activeMetaRef.current = null
    setIsTourActive(false)
    setLiveAnnouncement('')
  }, [clearPendingLaunch])

  useEffect(() => {
    setHasCompletedMainTour(readTourStatus(mainStorageKey) === 'completed')
  }, [mainStorageKey])

  const launchTour = useCallback(
    (
      definitionsBuilder: () => TourStepDefinition[],
      meta: ActiveTourMeta,
      restoreFocusTarget: HTMLElement | null
    ) => {
      if (typeof window === 'undefined' || isLoginPath(pathnameRef.current)) {
        return
      }

      const execute = async () => {
        const currentRunId = ++runIdRef.current

        if (driverRef.current) {
          driverRef.current.destroy()
          driverRef.current = null
        }

        const steps = resolveAvailableTourSteps(definitionsBuilder())
        if (steps.length === 0) {
          return
        }

        const { driver } = await import('driver.js')

        if (currentRunId !== runIdRef.current || isLoginPath(pathnameRef.current)) {
          return
        }

        // Re-resolve steps right before starting in case DOM changed during dynamic import
        const freshSteps = resolveAvailableTourSteps(definitionsBuilder())
        if (freshSteps.length === 0) {
          return
        }

        const reducedMotion = prefersReducedMotion()
        const darkMode = isDarkAdminThemeActive()
        previousFocusRef.current = restoreFocusTarget
        activeMetaRef.current = meta

        const config: Config = {
          steps: freshSteps,
          animate: !reducedMotion,
          duration: reducedMotion ? 0 : 220,
          smoothScroll: !reducedMotion,
          allowClose: true,
          allowKeyboardControl: true,
          skipMissingElement: true,
          focus: 'popover',
          overlayColor: darkMode ? '#000000' : '#0f1115',
          overlayOpacity: darkMode ? 0.72 : 0.55,
          stagePadding: 8,
          stageRadius: 10,
          popoverOffset: 12,
          popoverClass: 'balkon-tour-popover',
          showProgress: true,
          progressText: t('tour.progressText'),
          showButtons: ['next', 'previous', 'close'],
          nextBtnText: t('tour.nextBtn'),
          prevBtnText: t('tour.prevBtn'),
          doneBtnText: t('tour.doneBtn'),
          closeBtnLabel: t('tour.closeLabel'),
          onPopoverRender: (popover) => {
            const titleId = popover.title.id || 'driver-popover-title'
            const descId = popover.description.id || 'driver-popover-description'
            popover.title.id = titleId
            popover.description.id = descId

            popover.wrapper.setAttribute('role', 'dialog')
            popover.wrapper.setAttribute('aria-modal', 'false')
            popover.wrapper.setAttribute('aria-labelledby', titleId)
            popover.wrapper.setAttribute('aria-describedby', descId)
            popover.closeButton.setAttribute('aria-label', t('tour.closeLabel'))
            popover.closeButton.setAttribute('title', t('tour.closeLabel'))

            const progressText = popover.progress.textContent?.trim() ?? ''
            const titleText = popover.title.textContent?.trim() ?? ''
            const descText = popover.description.textContent?.trim() ?? ''
            const summary = [progressText, titleText, descText].filter(Boolean).join('. ')
            if (summary) {
              setLiveAnnouncement(summary)
            }
          },
          onDestroyed: (_element, _step, opts) => {
            const reason: DestroyReason | undefined = opts.reason
            const closedMeta = activeMetaRef.current

            driverRef.current = null
            activeMetaRef.current = null
            setIsTourActive(false)
            setLiveAnnouncement('')

            if (closedMeta && reason !== 'api' && reason !== 'replaced') {
              const status: TourCompletionStatus =
                reason === 'done' ? 'completed' : 'dismissed'
              persistTourStatus(closedMeta.storageKey, status)
              if (closedMeta.kind === 'main') {
                setHasCompletedMainTour(status === 'completed')
              }
            }

            if (reason !== 'api' && reason !== 'replaced') {
              const target = previousFocusRef.current
              previousFocusRef.current = null
              if (target && target.isConnected) {
                window.requestAnimationFrame(() => {
                  if (target.isConnected) {
                    target.focus({ preventScroll: true })
                  }
                })
              }
            } else {
              previousFocusRef.current = null
            }
          },
        }

        const instance = driver(config)
        driverRef.current = instance
        setIsTourActive(true)
        instance.drive(0)
      }

      clearPendingLaunch()

      // When triggered from HelpDrawer, close the drawer first so Radix Dialog focus scope
      // releases before Driver.js opens its popover.
      if (isHelpDrawerOpenRef.current) {
        setIsHelpDrawerOpen(false)
        const delayMs = prefersReducedMotion() ? 20 : 200
        pendingLaunchTimeoutRef.current = window.setTimeout(() => {
          pendingLaunchTimeoutRef.current = null
          void execute()
        }, delayMs)
        return
      }

      void execute()
    },
    [clearPendingLaunch]
  )

  const captureManualFocusReturnTarget = useCallback((): HTMLElement | null => {
    if (isHelpDrawerOpenRef.current) {
      return getGuideTriggerElement()
    }
    return document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
      ? document.activeElement
      : getGuideTriggerElement()
  }, [])

  const startMainTour = useCallback(() => {
    const focusTarget = captureManualFocusReturnTarget()
    launchTour(
      getMainTourStepDefinitions,
      { kind: 'main', storageKey: mainStorageKey },
      focusTarget
    )
  }, [captureManualFocusReturnTarget, launchTour, mainStorageKey])

  const restartTour = useCallback(() => {
    startMainTour()
  }, [startMainTour])

  const startPageTour = useCallback(
    (page: TourPageKey) => {
      const focusTarget = captureManualFocusReturnTarget()
      launchTour(
        () => getPageTourStepDefinitions(page),
        { kind: 'page', storageKey: getPageStorageKey(userKey, page) },
        focusTarget
      )
    },
    [captureManualFocusReturnTarget, launchTour, userKey]
  )

  const openHelpDrawer = useCallback(() => {
    if (isLoginPath(pathnameRef.current)) {
      return
    }
    setIsHelpDrawerOpen(true)
  }, [])

  const closeHelpDrawer = useCallback(() => {
    setIsHelpDrawerOpen(false)
  }, [])

  // Clean up active tour and drawer whenever the route changes or provider unmounts.
  useEffect(() => {
    setIsHelpDrawerOpen(false)
    destroyActiveDriver()
    return () => {
      destroyActiveDriver()
    }
  }, [pathname, destroyActiveDriver])

  // Auto-start main tour once on `/admin`, or sub-page mini tour once on `/admin/analytics`
  // and `/admin/performance` when no prior completion/dismissal exists for the current user.
  useEffect(() => {
    if (!pathname || isLoginPath(pathname)) {
      return
    }

    if (pathname === '/admin') {
      if (readTourStatus(mainStorageKey) !== null) {
        return
      }

      const timerId = window.setTimeout(() => {
        if (driverRef.current?.isActive() || isHelpDrawerOpenRef.current) {
          return
        }
        launchTour(
          getMainTourStepDefinitions,
          { kind: 'main', storageKey: mainStorageKey },
          getGuideTriggerElement()
        )
      }, 350)

      return () => {
        window.clearTimeout(timerId)
      }
    }

    let autoPage: TourPageKey | null = null
    if (pathname.startsWith('/admin/analytics')) {
      autoPage = 'analytics'
    } else if (pathname.startsWith('/admin/performance')) {
      autoPage = 'performance'
    }

    if (!autoPage) {
      return
    }

    const pageStorageKey = getPageStorageKey(userKey, autoPage)
    if (readTourStatus(pageStorageKey) !== null) {
      return
    }

    const targetPage = autoPage
    let attempts = 0
    const maxAttempts = 10

    const intervalId = window.setInterval(() => {
      attempts += 1

      if (driverRef.current?.isActive() || isHelpDrawerOpenRef.current) {
        window.clearInterval(intervalId)
        return
      }

      const availableSteps = resolveAvailableTourSteps(
        getPageTourStepDefinitions(targetPage)
      )

      if (availableSteps.length > 0) {
        window.clearInterval(intervalId)
        launchTour(
          () => getPageTourStepDefinitions(targetPage),
          { kind: 'page', storageKey: pageStorageKey },
          getGuideTriggerElement()
        )
        return
      }

      if (attempts >= maxAttempts) {
        window.clearInterval(intervalId)
      }
    }, 300)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [pathname, userKey, mainStorageKey, launchTour])

  const contextValue = useMemo<UseAdminTourReturn>(
    () => ({
      startMainTour,
      restartTour,
      startPageTour,
      openHelpDrawer,
      closeHelpDrawer,
      isHelpDrawerOpen,
      isTourActive,
      hasCompletedMainTour,
    }),
    [
      startMainTour,
      restartTour,
      startPageTour,
      openHelpDrawer,
      closeHelpDrawer,
      isHelpDrawerOpen,
      isTourActive,
      hasCompletedMainTour,
    ]
  )

  return (
    <AdminTourContext.Provider value={contextValue}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>
      {!loginRoute ? <HelpDrawer /> : null}
    </AdminTourContext.Provider>
  )
}
