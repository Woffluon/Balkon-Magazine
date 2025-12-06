import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/config/env'
import { logger } from '@/lib/services/Logger'

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
  let response = NextResponse.next({
    request: {
      headers: request.headers,
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
              headers: request.headers,
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
              headers: request.headers,
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

  let session = null

  // Wrap getSession in try-catch to handle auth failures gracefully
  try {
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      logger.error('Failed to get session in middleware', {
        operation: 'middleware.getSession',
        pathname,
        url: request.url,
        error: error.message,
        errorCode: error.status,
      })
      
      // Fallback: treat as unauthenticated and redirect to login
      if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
      
      return response
    }
    
    session = data.session
  } catch (error) {
    // Handle unexpected errors during session retrieval
    logger.error('Unexpected error in middleware during session retrieval', {
      operation: 'middleware.getSession',
      pathname,
      url: request.url,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    // Fallback: treat as unauthenticated and redirect to login
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    
    return response
  }

  // Check if session needs refresh (within 5 minutes of expiration)
  if (session) {
    const expiresAt = session.expires_at
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000) // Current time in seconds
      const timeUntilExpiry = expiresAt - now
      const fiveMinutes = 5 * 60 // 300 seconds
      
      // If session expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < fiveMinutes && timeUntilExpiry > 0) {
        try {
          const { error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshError) {
            logger.warn('Failed to refresh session in middleware', {
              operation: 'middleware.refreshSession',
              pathname,
              url: request.url,
              error: refreshError.message,
              errorCode: refreshError.status,
              timeUntilExpiry,
            })
          }
        } catch (error) {
          logger.error('Unexpected error during session refresh in middleware', {
            operation: 'middleware.refreshSession',
            pathname,
            url: request.url,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          })
        }
      }
    }
  }

  if (!session && pathname.startsWith('/admin') && pathname !== '/admin/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (session && pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
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
  matcher: ['/admin/:path*'],
}

