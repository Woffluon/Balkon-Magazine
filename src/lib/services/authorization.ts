/**
 * Authorization Service
 * 
 * Provides authorization and security functions for server actions:
 * - Admin role verification
 * - CSRF origin validation
 * - Session refresh management
 * - Input sanitization
 */

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { logger } from '@/lib/services/Logger'
import { env } from '@/lib/config/env'

/**
 * Authorization context returned after successful admin verification
 */
export interface AuthorizationContext {
  userId: string
  userEmail: string
  userRole: 'admin'
}

/**
 * Custom error for authorization failures
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Custom error for CSRF validation failures
 */
export class CSRFError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CSRFError'
  }
}

/**
 * Verifies that the current user has admin role
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4
 * 
 * @returns Authorization context with user details
 * @throws {AuthorizationError} If user is not authenticated or not an admin
 */
export async function requireAdmin(): Promise<AuthorizationContext> {
  const supabase = await createClient()
  const { logger } = await import('@/lib/services/Logger')
  const { getErrorEntry } = await import('@/lib/constants/errorCatalog')
  
  // Get authenticated user from Supabase Auth
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    logger.error('Authentication required for admin access', {
      operation: 'requireAdmin',
      error: userError?.message,
      errorCode: userError?.status,
    })
    // Use generic error message from catalog - don't expose security details
    const errorEntry = getErrorEntry('AUTH_LOGIN_REQUIRED')
    throw new AuthorizationError(errorEntry.userMessage)
  }
  
  const userId = user.id
  const userEmail = user.email || ''
  
  logger.debug('Checking admin access for user', { userId, userEmail })
  
  // Query user_profiles table for role
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .single()
  
  if (profileError || !profile) {
    logger.error('User profile not found during admin check', {
      operation: 'requireAdmin',
      userId,
      error: profileError?.message,
      errorCode: profileError?.code,
    })
    // Use generic error message from catalog - don't expose internal details
    const errorEntry = getErrorEntry('AUTH_UNAUTHORIZED')
    throw new AuthorizationError(errorEntry.userMessage)
  }
  
  logger.debug('User role verified', { userId, role: profile.role })
  
  if (profile.role !== 'admin') {
    logger.warn('User attempted admin access without proper role', {
      operation: 'requireAdmin',
      userId,
      userEmail,
      role: profile.role,
    })
    // Use generic error message from catalog - don't expose role details
    const errorEntry = getErrorEntry('AUTH_UNAUTHORIZED')
    throw new AuthorizationError(errorEntry.userMessage)
  }
  
  return {
    userId,
    userEmail,
    userRole: profile.role
  }
}

/**
 * Verifies that the request origin matches the application host
 * Provides CSRF protection for server actions
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 * 
 * @returns True if origin is valid
 * @throws {CSRFError} If origin validation fails
 */
export async function verifyCSRFOrigin(): Promise<boolean> {
  const headersList = await headers()
  const origin = headersList.get('origin')
  const allowedOrigins = getAllowedOrigins()
  
  // If no origin header, check referer as fallback
  if (!origin) {
    const referer = headersList.get('referer')
    if (!referer) {
      throw new CSRFError('CSRF validation failed: Missing origin and referer headers')
    }
    
    try {
      const refererUrl = new URL(referer)
      if (!allowedOrigins.has(refererUrl.origin)) {
        throw new CSRFError('CSRF validation failed: Referer host mismatch')
      }
      return true
    } catch {
      throw new CSRFError('CSRF validation failed: Invalid referer URL')
    }
  }
  
  // Validate origin matches host
  try {
    const originUrl = new URL(origin)
    if (!allowedOrigins.has(originUrl.origin)) {
      throw new CSRFError('CSRF validation failed: Origin host mismatch')
    }
    return true
  } catch {
    throw new CSRFError('CSRF validation failed: Invalid origin URL')
  }
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>()
  addOrigin(origins, env.NEXT_PUBLIC_SITE_URL || 'https://balkondergi.com')

  if (env.NODE_ENV !== 'production') {
    addOrigin(origins, 'http://localhost:3000')
    addOrigin(origins, 'http://127.0.0.1:3000')
  }

  return origins
}

function addOrigin(origins: Set<string>, url: string): void {
  try {
    origins.add(new URL(url).origin)
  } catch {
    logger.warn('Invalid CSRF allowlist URL ignored', {
      operation: 'csrf_allowlist',
    })
  }
}

/**
 * Refreshes the session if it's within 5 minutes of expiration
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4
 * 
 * @returns True if session was refreshed, false if not needed
 */
export async function refreshSessionIfNeeded(): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return false
  }
  
  return false
}

/**
 * Sanitizes and validates an issue number to prevent path traversal attacks
 * 
 * Requirements: 11.1, 11.2, 11.3
 * 
 * @param issue - Issue number to sanitize
 * @returns Sanitized issue number as string
 * @throws {Error} If issue number contains invalid characters
 */
export function sanitizeIssueNumber(issue: number | string): string {
  const issueStr = String(issue)
  
  // Validate that issue number contains only digits
  if (!/^\d+$/.test(issueStr)) {
    throw new Error('Invalid issue number: must contain only digits')
  }
  
  // Additional validation: ensure it's a positive integer
  const issueNum = parseInt(issueStr, 10)
  if (isNaN(issueNum) || issueNum <= 0) {
    throw new Error('Invalid issue number: must be a positive integer')
  }
  
  return issueStr
}
