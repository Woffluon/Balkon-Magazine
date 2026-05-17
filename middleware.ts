import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/config/env'
import { logger } from '@/lib/services/Logger'

function createNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function buildCspHeader(nonce: string): string {
  const supabaseDomain = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname
  const connectSources = [`'self'`, `https://${supabaseDomain}`, 'https://*.supabase.co']

  if (env.NEXT_PUBLIC_R2_PUBLIC_URL) {
    try {
      connectSources.push(`https://${new URL(env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname}`)
    } catch {
      logger.warn('Invalid R2 public URL ignored for CSP', {
        operation: 'middleware.csp',
      })
    }
  }

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectSources.join(' ')}`,
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set('Content-Security-Policy', buildCspHeader(nonce))
  response.headers.set('x-nonce', nonce)
  return response
}

function redirectWithSecurityHeaders(path: string, request: NextRequest, nonce: string): NextResponse {
  return applySecurityHeaders(NextResponse.redirect(new URL(path, request.url)), nonce)
}

/**
 * Middleware for authentication and session management
 * 
 * Features:
 * - Automatic session refresh when within 5 minutes of expiration
 * - Redirects unauthenticated users to login page
 * - Redirects authenticated users away from login page
 * - Graceful error handling with fallback redirect logic
 * 
 * Requirements: 1.1, 13.1, 13.2, 13.3, 13.4
 * 
 * Note: Supabase JWT expiry should be configured to 1 hour in the Supabase dashboard:
 * Settings > Auth > JWT Expiry = 3600 seconds (1 hour)
 */
export async function middleware(request: NextRequest) {
  const nonce = createNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  let user = null

  // Wrap user verification in try-catch to handle auth failures gracefully
  try {
    const { data, error } = await supabase.auth.getUser()
    
    if (error) {
      logger.error('Failed to verify user in middleware', {
        operation: 'middleware.getUser',
        pathname,
        error: error.message,
        errorCode: error.status,
      })
      
      // Fallback: treat as unauthenticated and redirect to login
      if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        return redirectWithSecurityHeaders('/admin/login', request, nonce)
      }
      
      return applySecurityHeaders(response, nonce)
    }
    
    user = data.user
  } catch (error) {
    // Handle unexpected errors during session retrieval
    logger.error('Unexpected error in middleware during user verification', {
      operation: 'middleware.getUser',
      pathname,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    // Fallback: treat as unauthenticated and redirect to login
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
      return redirectWithSecurityHeaders('/admin/login', request, nonce)
    }
    
    return applySecurityHeaders(response, nonce)
  }

  if (!user && pathname.startsWith('/admin') && pathname !== '/admin/login') {
    return redirectWithSecurityHeaders('/admin/login', request, nonce)
  }

  if (user && pathname === '/admin/login') {
    return redirectWithSecurityHeaders('/admin', request, nonce)
  }

  return applySecurityHeaders(response, nonce)
}

/**
 * Middleware configuration
 * 
 * Note: Route groups like (admin) are ignored in URLs, so /admin/:path* 
 * still matches routes in src/app/(admin)/admin/
 * 
 * Requirements: 15.4
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.png|og-image.jpg|pdf.worker.min.mjs).*)',
  ],
}

