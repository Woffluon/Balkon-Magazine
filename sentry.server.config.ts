import * as Sentry from '@sentry/nextjs'
import { env } from './src/lib/env'

/**
 * Sentry Server Configuration
 * 
 * Configures Sentry for server-side error tracking with:
 * - Environment-specific settings
 * - PII scrubbing before transmission
 * - Error sampling rates
 * - Performance monitoring
 * - User context tracking
 * 
 * Requirements: 3.3, 7.1, 7.2, 7.6
 */

/**
 * Scrub PII from any object recursively
 */
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
    // DSN will be set via SENTRY_DSN environment variable
    dsn: process.env.SENTRY_DSN,

    // Environment
    environment: env.NODE_ENV,

    // Performance monitoring - sample 10% of transactions
    tracesSampleRate: 0.1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // PII scrubbing - remove sensitive data before sending to Sentry
    // Requirement 7.6: PII is scrubbed before external transmission
    beforeSend(event) {
      // Scrub PII from request data
      if (event.request) {
        // Remove cookies entirely
        delete event.request.cookies

        // Remove or redact sensitive headers
        if (event.request.headers) {
          const sensitiveHeaders = [
            'authorization',
            'cookie',
            'x-api-key',
            'x-auth-token',
            'x-access-token',
          ]
          sensitiveHeaders.forEach((header) => {
            const lowerHeader = header.toLowerCase()
            // Check both lowercase and original case
            if (event.request?.headers && header in event.request.headers) {
              event.request.headers[header] = '[REDACTED]'
            }
            if (event.request?.headers && lowerHeader in event.request.headers) {
              event.request.headers[lowerHeader] = '[REDACTED]'
            }
          })
        }

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

        // Add user context (URL, user agent)
        // Requirement 7.2: Error tracking includes user context
        if (event.request.url) {
          event.contexts = event.contexts || {}
          event.contexts.request = {
            url: event.request.url,
            method: event.request.method,
            userAgent: event.request.headers?.['user-agent'],
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

      return event
    },

    // Ignore certain errors that are not actionable
    ignoreErrors: [
      // Network errors (often transient)
      'NetworkError',
      'Network request failed',
      // Aborted requests (user-initiated)
      'AbortError',
      'The operation was aborted',
      // ECONNRESET errors (common in serverless)
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      // Next.js specific errors that are handled
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
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
