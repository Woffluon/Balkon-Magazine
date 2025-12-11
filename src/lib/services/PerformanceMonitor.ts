/**
 * PerformanceMonitor - Tracks operation timing and logs slow operations
 * 
 * Requirements: 9.1, 9.2, 9.5
 */

export interface OperationMetrics {
  label: string
  startTime: number
  endTime?: number
  duration?: number
}

export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map()
  private readonly slowOperationThreshold: number

  constructor(slowOperationThreshold: number = 1000) {
    this.slowOperationThreshold = slowOperationThreshold
  }

  /**
   * Start timing an operation
   * Requirement 9.1: Log start time for operations
   */
  start(label: string): void {
    this.metrics.set(label, Date.now())
  }

  /**
   * End timing an operation and log if slow
   * Requirement 9.2: Log slow queries (>1 second) with details
   * Requirement 9.5: Log success or failure status with relevant metrics
   */
  end(label: string): number {
    const start = this.metrics.get(label)
    if (!start) {
      console.warn(`PerformanceMonitor: No start time found for "${label}"`)
      return 0
    }

    const duration = Date.now() - start
    this.metrics.delete(label)

    // Log slow operations
    if (duration > this.slowOperationThreshold) {
      console.warn(`[SLOW OPERATION] ${label} took ${duration}ms (threshold: ${this.slowOperationThreshold}ms)`)
    }

    return duration
  }

  /**
   * Measure an async operation and log timing
   * Requirement 9.1: Log start time, end time, and duration
   * Requirement 9.5: Log success or failure status with relevant metrics
   */
  async measure<T>(
    label: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    this.start(label)

    try {
      const result = await operation()
      const duration = this.end(label)
      
      console.log(`[PERFORMANCE] ${label}: ${duration}ms (success)`)
      
      return result
    } catch (error) {
      const duration = this.end(label)
      
      console.error(`[PERFORMANCE] ${label}: ${duration}ms (failed)`, {
        error: error instanceof Error ? error.message : String(error)
      })
      
      throw error
    }
  }

  /**
   * Measure a synchronous operation and log timing
   * Requirement 9.1: Log start time, end time, and duration
   */
  measureSync<T>(label: string, operation: () => T): T {
    const startTime = Date.now()
    this.start(label)

    try {
      const result = operation()
      const duration = this.end(label)
      
      console.log(`[PERFORMANCE] ${label}: ${duration}ms (success)`)
      
      return result
    } catch (error) {
      const duration = this.end(label)
      
      console.error(`[PERFORMANCE] ${label}: ${duration}ms (failed)`, {
        error: error instanceof Error ? error.message : String(error)
      })
      
      throw error
    }
  }

  /**
   * Get all active metrics (operations that have started but not ended)
   */
  getActiveMetrics(): OperationMetrics[] {
    const now = Date.now()
    return Array.from(this.metrics.entries()).map(([label, startTime]) => ({
      label,
      startTime,
      duration: now - startTime
    }))
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear()
  }
}

// Export a singleton instance for convenience
export const performanceMonitor = new PerformanceMonitor()
