import { ReactNode } from 'react'

/**
 * Layout for public-facing pages
 * 
 * This layout wraps all public routes including:
 * - Home page
 * - Magazine detail pages
 * 
 * Requirements: 15.3, 15.4
 */
export default function PublicLayout({
  children,
}: {
  children: ReactNode
}) {
  return <>{children}</>
}
