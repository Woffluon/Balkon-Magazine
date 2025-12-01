import { env } from '@/lib/env'

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Context object for structured logging
 */
export interface LogContext {
  [key: string]: unknown
}

/**
 * Configuration for the Logger service
 */
export interface LoggerConfig {
  environment: 'development' | 'production' | 'test'
  enableConsole: boolean
  enableSentry: boolean
  minLevel: LogLevel
}

/**
 * PII field patterns to sanitize
 */
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
}

/**
 * PII field names to sanitize
 */
const PII_FIELD_NAMES = [
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
]

/**
 * Centralized Logger Service
 * 
 * Provides structured logging with:
 * - Log level filtering
 * - PII sanitization
 * - Environment-aware behavior (console in dev, Sentry in prod)
 * - Context propagation
 * - Performance timing utilities
 */
class LoggerService {
  private config: LoggerConfig
  private globalContext: LogContext = {}
  private timers: Map<string, number> = new Map()

  constructor(config?: Partial<LoggerConfig>) {
    const environment = env.NODE_ENV
    
    this.config = {
      environment,
      enableConsole: environment === 'development' || environment === 'test',
      enableSentry: environment === 'production',
      minLevel: environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      ...config,
    }
  }

  /**
   * Set global context that will be included in all log entries
   */
  setContext(context: LogContext): void {
    this.globalContext = { ...this.globalContext, ...context }
  }

  /**
   * Clear global context
   */
  clearContext(): void {
    this.globalContext = {}
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context)
  }

  /**
   * Start a performance timer
   * Returns a function that when called, logs the elapsed time
   */
  startTimer(label: string): () => void {
    const startTime = Date.now()
    this.timers.set(label, startTime)

    return () => {
      const endTime = Date.now()
      const duration = endTime - startTime
      this.logPerformance(label, duration)
      this.timers.delete(label)
    }
  }

  /**
   * Log performance timing
   * Logs slow operations (> 1s) as warnings and sends to Sentry
   */
  logPerformance(operation: string, duration: number): void {
    const context: LogContext = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
    }

    if (duration > 1000) {
      this.warn(`Slow operation: ${operation}`, context)
      // Send performance data to Sentry
      this.sendPerformanceToSentry(operation, duration)
    } else {
      this.debug(`Performance: ${operation}`, context)
    }
  }

  /**
   * Send performance data to Sentry
   */
  private async sendPerformanceToSentry(operation: string, duration: number): Promise<void> {
    if (!this.config.enableSentry) {
      return
    }

    try {
      // Dynamically import Sentry to avoid issues in environments where it's not available
      const Sentry = await import('@sentry/nextjs')
      
      // Send performance transaction to Sentry
      Sentry.captureMessage(`Slow operation: ${operation}`, {
        level: 'warning',
        extra: {
          operation,
          duration,
          durationSeconds: (duration / 1000).toFixed(2),
          timestamp: new Date().toISOString(),
        },
        tags: {
          environment: this.config.environment,
          operationType: 'performance',
          slow: 'true',
        },
      })
    } catch (error) {
      // Silently fail if Sentry is not available
      // This prevents errors in development or if Sentry is not configured
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Filter by log level
    if (level < this.config.minLevel) {
      return
    }

    // Build log entry with structured metadata
    const logEntry = this.buildLogEntry(level, message, context)

    // Output to console in development
    if (this.config.enableConsole) {
      this.logToConsole(level, logEntry)
    }

    // Send to Sentry in production
    if (this.config.enableSentry && level >= LogLevel.ERROR) {
      this.logToSentry(level, logEntry)
    }
  }

  /**
   * Build structured log entry
   */
  private buildLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): Record<string, unknown> {
    const mergedContext = { ...this.globalContext, ...context }
    const sanitizedContext = this.sanitizePII(mergedContext)

    return {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      environment: this.config.environment,
      context: sanitizedContext,
    }
  }

  /**
   * Sanitize PII from context
   */
  private sanitizePII(context: LogContext): LogContext {
    const sanitized: LogContext = {}

    for (const [key, value] of Object.entries(context)) {
      // Check if field name indicates PII
      if (PII_FIELD_NAMES.some((piiField) => 
        key.toLowerCase().includes(piiField.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]'
        continue
      }

      // Sanitize string values
      if (typeof value === 'string') {
        let sanitizedValue = value

        // Apply PII patterns
        for (const pattern of Object.values(PII_PATTERNS)) {
          sanitizedValue = sanitizedValue.replace(pattern, '[REDACTED]')
        }

        sanitized[key] = sanitizedValue
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizePII(value as LogContext)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Log to console with colors
   */
  private logToConsole(level: LogLevel, logEntry: Record<string, unknown>): void {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    }
    const reset = '\x1b[0m'

    const color = colors[level]
    const levelName = LogLevel[level]
    const timestamp = logEntry.timestamp
    const message = logEntry.message

    console.log(
      `${color}[${timestamp}] [${levelName}]${reset} ${message}`,
      logEntry.context
    )
  }

  /**
   * Log to Sentry
   */
  private async logToSentry(level: LogLevel, logEntry: Record<string, unknown>): Promise<void> {
    try {
      // Dynamically import Sentry to avoid issues in environments where it's not available
      const Sentry = await import('@sentry/nextjs')
      
      const context = logEntry.context as Record<string, unknown> | undefined
      
      if (level === LogLevel.ERROR) {
        Sentry.captureException(new Error(logEntry.message as string), {
          level: 'error',
          extra: context || {},
          tags: {
            environment: this.config.environment,
          },
        })
      } else if (level === LogLevel.WARN) {
        Sentry.captureMessage(logEntry.message as string, {
          level: 'warning',
          extra: context || {},
          tags: {
            environment: this.config.environment,
          },
        })
      }
    } catch (error) {
      // Silently fail if Sentry is not available
      // This prevents errors in development or if Sentry is not configured
    }
  }
}

// Export singleton instance
export const logger = new LoggerService()

// Export class for testing
export { LoggerService }
