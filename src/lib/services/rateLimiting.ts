/**
 * Rate Limiting Service
 * 
 * Provides in-memory rate limiting for login attempts and file uploads.
 * Implements time-window based rate limiting with automatic cleanup of expired entries.
 */

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number // milliseconds
}

interface RateLimitEntry {
  attempts: number
  resetTime: number // Unix timestamp
}

interface RateLimitStore {
  [key: string]: RateLimitEntry
}

/**
 * Rate limiter class that tracks attempts and enforces limits
 */
export class RateLimiter {
  private loginAttempts: RateLimitStore = {}
  private uploadAttempts: RateLimitStore = {}

  // Configuration
  private readonly LOGIN_CONFIG: RateLimitConfig = {
    maxAttempts: 999999, // Disabled - effectively unlimited
    windowMs: 15 * 60 * 1000, // 15 minutes
  }

  private readonly UPLOAD_CONFIG: RateLimitConfig = {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  }

  // Cleanup interval (run every 5 minutes)
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start automatic cleanup
    this.startCleanup()
  }

  /**
   * Check if login attempts from an IP address have exceeded the limit
   * @param ip - IP address to check
   * @returns true if limit is not exceeded, false if limit exceeded
   */
  checkLoginLimit(ip: string): boolean {
    return this.checkLimit(ip, this.loginAttempts, this.LOGIN_CONFIG)
  }

  /**
   * Record a failed login attempt for an IP address
   * @param ip - IP address to record
   */
  recordLoginAttempt(ip: string): void {
    this.recordAttempt(ip, this.loginAttempts, this.LOGIN_CONFIG)
  }

  /**
   * Reset login attempts for an IP address (e.g., after successful login)
   * @param ip - IP address to reset
   */
  resetLoginAttempts(ip: string): void {
    delete this.loginAttempts[ip]
  }

  /**
   * Check if upload attempts from a user have exceeded the limit
   * @param userId - User ID to check
   * @returns true if limit is not exceeded, false if limit exceeded
   */
  checkUploadLimit(userId: string): boolean {
    return this.checkLimit(userId, this.uploadAttempts, this.UPLOAD_CONFIG)
  }

  /**
   * Record an upload attempt for a user
   * @param userId - User ID to record
   */
  recordUploadAttempt(userId: string): void {
    this.recordAttempt(userId, this.uploadAttempts, this.UPLOAD_CONFIG)
  }

  /**
   * Reset upload attempts for a user
   * @param userId - User ID to reset
   */
  resetUploadAttempts(userId: string): void {
    delete this.uploadAttempts[userId]
  }

  /**
   * Generic method to check if a key has exceeded the limit
   */
  private checkLimit(
    key: string,
    store: RateLimitStore,
    config: RateLimitConfig
  ): boolean {
    const now = Date.now()
    const entry = store[key]

    // No entry exists, limit not exceeded
    if (!entry) {
      return true
    }

    // Entry expired, remove it and allow
    if (now >= entry.resetTime) {
      delete store[key]
      return true
    }

    // Check if attempts exceed limit
    return entry.attempts < config.maxAttempts
  }

  /**
   * Generic method to record an attempt
   */
  private recordAttempt(
    key: string,
    store: RateLimitStore,
    config: RateLimitConfig
  ): void {
    const now = Date.now()
    const entry = store[key]

    if (!entry || now >= entry.resetTime) {
      // Create new entry
      store[key] = {
        attempts: 1,
        resetTime: now + config.windowMs,
      }
    } else {
      // Increment existing entry
      entry.attempts++
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)

    // Ensure cleanup runs on process exit
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => {
        this.stopCleanup()
      })
    }
  }

  /**
   * Stop automatic cleanup
   */
  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Clean up expired entries from both stores
   */
  private cleanup(): void {
    const now = Date.now()

    // Clean login attempts
    for (const key in this.loginAttempts) {
      if (now >= this.loginAttempts[key].resetTime) {
        delete this.loginAttempts[key]
      }
    }

    // Clean upload attempts
    for (const key in this.uploadAttempts) {
      if (now >= this.uploadAttempts[key].resetTime) {
        delete this.uploadAttempts[key]
      }
    }
  }

  /**
   * Get remaining attempts for a key (useful for debugging/testing)
   */
  getRemainingLoginAttempts(ip: string): number {
    const entry = this.loginAttempts[ip]
    if (!entry || Date.now() >= entry.resetTime) {
      return this.LOGIN_CONFIG.maxAttempts
    }
    return Math.max(0, this.LOGIN_CONFIG.maxAttempts - entry.attempts)
  }

  /**
   * Get remaining upload attempts for a user (useful for debugging/testing)
   */
  getRemainingUploadAttempts(userId: string): number {
    const entry = this.uploadAttempts[userId]
    if (!entry || Date.now() >= entry.resetTime) {
      return this.UPLOAD_CONFIG.maxAttempts
    }
    return Math.max(0, this.UPLOAD_CONFIG.maxAttempts - entry.attempts)
  }

  /**
   * Get time until reset for login attempts (in milliseconds)
   */
  getLoginResetTime(ip: string): number | null {
    const entry = this.loginAttempts[ip]
    if (!entry) return null
    const remaining = entry.resetTime - Date.now()
    return remaining > 0 ? remaining : null
  }

  /**
   * Get time until reset for upload attempts (in milliseconds)
   */
  getUploadResetTime(userId: string): number | null {
    const entry = this.uploadAttempts[userId]
    if (!entry) return null
    const remaining = entry.resetTime - Date.now()
    return remaining > 0 ? remaining : null
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter()
