'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  BookOpen,
  ExternalLink,
  Gauge,
  HelpCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ThemeToggle } from '@/components/admin/ThemeToggle'
import { UserMenu } from '@/app/(admin)/admin/UserMenu'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface AdminShellProps {
  userEmail?: string
  children: ReactNode
  onOpenGuide?: () => void
}

interface NavItem {
  href: string
  label: string
  icon: typeof BookOpen
  matchExact?: boolean
}

function getCurrentPageTitle(pathname: string | null): string {
  if (!pathname || pathname === '/admin') {
    return t('nav.magazines')
  }
  if (pathname.startsWith('/admin/analytics')) {
    return t('analytics.title')
  }
  if (pathname.startsWith('/admin/performance')) {
    return t('performance.title')
  }
  return t('nav.adminPanel')
}

function isNavItemActive(pathname: string | null, item: NavItem): boolean {
  if (!pathname) return false
  if (item.matchExact) {
    return pathname === item.href
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/**
 * Shared responsive shell for authenticated admin pages providing persistent navigation,
 * theme toggle, guide trigger, and account menu across desktop and mobile viewports.
 */
export function AdminShell({ userEmail, children, onOpenGuide }: AdminShellProps) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isLoginRoute =
    pathname === '/admin/login' || Boolean(pathname?.startsWith('/admin/login/'))

  if (isLoginRoute) {
    return <>{children}</>
  }

  const navItems: NavItem[] = [
    {
      href: '/admin',
      label: t('nav.magazines'),
      icon: BookOpen,
      matchExact: true,
    },
    {
      href: '/admin/analytics',
      label: t('nav.analytics'),
      icon: BarChart3,
    },
    {
      href: '/admin/performance',
      label: t('nav.performance'),
      icon: Gauge,
    },
  ]

  const currentPageTitle = getCurrentPageTitle(pathname)

  const renderBrandHeader = (collapsed: boolean) => (
    <Link
      href="/admin"
      onClick={() => setMobileMenuOpen(false)}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        collapsed && 'justify-center px-0'
      )}
      aria-label={`${t('nav.brandTitle')} ${t('nav.brandSubtitle')} — ${t('nav.adminPanel')}`}
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
      >
        B
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-bold tracking-tight text-foreground">
            {t('nav.brandTitle')}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {t('nav.adminPanel')}
          </span>
        </span>
      )}
    </Link>
  )

  const renderNavLinks = (collapsed: boolean, closeDrawerOnClick = false) => (
    <nav aria-label={t('nav.adminPanel')} className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isNavItemActive(pathname, item)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (closeDrawerOnClick) {
                setMobileMenuOpen(false)
              }
            }}
            aria-current={active ? 'page' : undefined}
            aria-label={collapsed ? item.label : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[color,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none',
              collapsed && 'justify-center px-2',
              active
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )

  const renderFooterLink = (collapsed: boolean, closeDrawerOnClick = false) => (
    <div className="border-t border-border pt-3">
      <Link
        href="/"
        onClick={() => {
          if (closeDrawerOnClick) {
            setMobileMenuOpen(false)
          }
        }}
        aria-label={collapsed ? t('common.viewSite') : undefined}
        title={collapsed ? t('common.viewSite') : undefined}
        className={cn(
          'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-[color,background-color] duration-150 ease-out hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none',
          collapsed && 'justify-center px-2'
        )}
      >
        <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
        {!collapsed && <span className="truncate">{t('common.viewSite')}</span>}
      </Link>
    </div>
  )

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Ana içeriğe geç
      </a>

      {/* Desktop Sidebar */}
      <aside
        data-tour="admin-sidebar"
        className={cn(
          'hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:shrink-0 lg:flex-col lg:justify-between lg:border-r lg:border-border lg:bg-card lg:p-3 lg:transition-[width] lg:duration-150 lg:ease-out motion-reduce:transition-none',
          sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-60'
        )}
      >
        <div className="flex flex-col gap-5">
          <div className="flex h-8 items-center">{renderBrandHeader(sidebarCollapsed)}</div>
          {renderNavLinks(sidebarCollapsed)}
        </div>
        {renderFooterLink(sidebarCollapsed)}
      </aside>

      {/* Mobile Navigation Drawer */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent
          className={cn(
            'top-0 left-0 flex h-full w-72 max-w-[85vw] translate-x-0 translate-y-0 flex-col justify-between gap-0 rounded-none rounded-r-xl border-y-0 border-l-0 bg-card p-4 sm:max-w-72',
            'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100'
          )}
        >
          <div className="flex flex-col gap-5">
            <DialogHeader className="pr-10 text-left">
              <DialogTitle className="sr-only">{t('nav.adminPanel')}</DialogTitle>
              <DialogDescription className="sr-only">
                {t('nav.magazines')}, {t('nav.analytics')}, {t('nav.performance')}
              </DialogDescription>
              {renderBrandHeader(false)}
            </DialogHeader>
            {renderNavLinks(false, true)}
          </div>
          {renderFooterLink(false, true)}
        </DialogContent>
      </Dialog>

      {/* Right Column: Sticky Top Bar + Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between gap-2 border-b border-border bg-card/95 px-3 backdrop-blur-sm sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t('nav.openMenu')}
              aria-expanded={mobileMenuOpen}
              className="lg:hidden"
            >
              <Menu className="size-4" aria-hidden="true" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={
                sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')
              }
              aria-expanded={!sidebarCollapsed}
              title={sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
              className="hidden lg:inline-flex"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="size-4" aria-hidden="true" />
              )}
            </Button>

            <span className="truncate text-sm font-semibold text-foreground sm:hidden">
              {currentPageTitle}
            </span>

            <Breadcrumb className="hidden min-w-0 sm:block">
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem className="shrink-0">
                  <BreadcrumbLink asChild>
                    <Link href="/admin">{t('nav.adminPanel')}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="shrink-0" />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate font-medium">
                    {currentPageTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />

            <Button
              type="button"
              variant="outline"
              onClick={onOpenGuide}
              data-tour="guide-trigger"
              aria-label={t('nav.guide')}
              title={t('nav.guide')}
              className="min-h-9 min-w-9 px-2.5 sm:px-3"
            >
              <HelpCircle className="size-4 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline text-xs font-medium">
                {t('nav.guide')}
              </span>
            </Button>

            {userEmail ? <UserMenu userEmail={userEmail} /> : null}
          </div>
        </header>

        <main id="admin-main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}
