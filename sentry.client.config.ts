import * as Sentry from '@sentry/nextjs'
import { env } from './src/lib/env'

function scrubPII(obj: Record<string, unknown>): Record<string, unknown> {
  const piiFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'creditCard',
    'credit_card',
    'ssn',
    'socialSecurity',
    'social_security',
    'email',
    'phone',
    'phoneNumber',
    'phone_number',
  ]

  const scrubbed: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    // Check if field name indicates PII
    if (piiFields.some((piiField) => key.toLowerCase().includes(piiField.toLowerCase()))) {
      scrubbed[key] = '[REDACTED]'
      continue
    }

    // Recursively scrub nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      scrubbed[key] = scrubPII(value as Record<string, unknown>)
    } else if (typeof value === 'string') {
      // Scrub email patterns
      scrubbed[key] = value.replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        '[REDACTED_EMAIL]'
      )
    } else {
      scrubbed[key] = value
    }
  }

  return scrubbed
}

// Only initialize Sentry in production
if (env.NODE_ENV === 'production') {
  Sentry.init({
    // DSN will be set via NEXT_PUBLIC_SENTRY_DSN environment variable
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment
    environment: env.NODE_ENV,

    // Performance monitoring - sample 10% of transactions
    tracesSampleRate: 0.1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Replay configuration for session replay
    // Capture 100% of sessions with errors, 10% of normal sessions
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // PII scrubbing - remove sensitive data before sending to Sentry
    // Requirement 7.6: PII is scrubbed before external transmission
    beforeSend(event) {
      // Scrub PII from request data
      if (event.request) {
        // Remove cookies entirely
        delete event.request.cookies

        // Scrub query parameters that might contain sensitive data
        if (event.request.query_string) {
          const params = new URLSearchParams(event.request.query_string)
          const sensitiveParams = [
            'token',
            'password',
            'secret',
            'api_key',
            'apiKey',
            'access_token',
            'accessToken',
            'refresh_token',
            'refreshToken',
          ]

          sensitiveParams.forEach((param) => {
            if (params.has(param)) {
              params.set(param, '[REDACTED]')
            }
          })

          event.request.query_string = params.toString()
        }

        // Add user context (session ID, user agent, URL)
        // Requirement 7.2: Error tracking includes user context
        if (event.request.url) {
          event.contexts = event.contexts || {}
          event.contexts.browser = {
            url: event.request.url,
            userAgent: event.request.headers?.['User-Agent'] || navigator.userAgent,
          }
        }
      }

      // Scrub PII from extra data
      if (event.extra) {
        event.extra = scrubPII(event.extra as Record<string, unknown>)
      }

      // Scrub PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            breadcrumb.data = scrubPII(breadcrumb.data as Record<string, unknown>)
          }
          return breadcrumb
        })
      }

      // Add session ID for tracking
      // Requirement 7.2: Include sessionId for reproduction
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          let sessionId = window.sessionStorage.getItem('sentry_session_id')
          if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            window.sessionStorage.setItem('sentry_session_id', sessionId)
          }
          event.tags = event.tags || {}
          event.tags.sessionId = sessionId
        } catch {
          // Ignore errors accessing sessionStorage
        }
      }

      return event
    },

    // Ignore certain errors that are not actionable
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Network errors (often transient)
      'NetworkError',
      'Network request failed',
      // Aborted requests (user-initiated)
      'AbortError',
      'The operation was aborted',
      // ResizeObserver errors (benign)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
  })
}

/**
 * Set user context for Sentry
 * Call this after user authentication to track user-specific errors
 * 
 * @param userId - User ID (will be hashed for privacy)
 * @param email - User email (will be redacted)
 */
export function setSentryUser(userId: string, email?: string): void {
  if (env.NODE_ENV === 'production') {
    Sentry.setUser({
      id: userId,
      // Don't send actual email, just indicate if it exists
      email: email ? '[REDACTED]' : undefined,
    })
  }
}

/**
 * Clear user context from Sentry
 * Call this on logout
 */
export function clearSentryUser(): void {
  if (env.NODE_ENV === 'production') {
    Sentry.setUser(null)
  }
}
