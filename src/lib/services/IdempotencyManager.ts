/**
 * IdempotencyManager
 * 
 * Manages idempotency keys to prevent duplicate operations.
 * Uses localStorage to track completed operations.
 * 
 * Requirements: 4.3, 4.4
 */

export class IdempotencyManager {
  private storage: Storage | null
  private prefix: string = 'idempotency_'
  
  constructor() {
    // Check if we're in a browser environment
    this.storage = typeof window !== 'undefined' && window.localStorage 
      ? window.localStorage 
      : null
  }

  /**
   * Generate a unique idempotency key
   * Uses crypto.randomUUID() for cryptographically secure random IDs
   * 
   * @returns A unique UUID string
   */
  generateKey(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    
    // Fallback for environments without crypto.randomUUID
    // This should rarely happen in modern browsers
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Check if an operation with the given key has been completed
   * 
   * @param key - The idempotency key to check
   * @returns true if the operation has been completed, false otherwise
   */
  isCompleted(key: string): boolean {
    if (!this.storage) {
      return false
    }
    
    return this.storage.getItem(this.prefix + key) === 'completed'
  }

  /**
   * Mark an operation as completed
   * 
   * @param key - The idempotency key to mark as completed
   */
  markCompleted(key: string): void {
    if (!this.storage) {
      return
    }
    
    this.storage.setItem(this.prefix + key, 'completed')
  }

  /**
   * Clear a completed operation key
   * Useful for cleanup after successful operations
   * 
   * @param key - The idempotency key to clear
   */
  clear(key: string): void {
    if (!this.storage) {
      return
    }
    
    this.storage.removeItem(this.prefix + key)
  }

  /**
   * Clear all idempotency keys
   * Useful for testing or cleanup
   */
  clearAll(): void {
    if (!this.storage) {
      return
    }
    
    const keysToRemove: string[] = []
    
    // Find all keys with our prefix
    for (let storageIndex = 0; storageIndex < this.storage.length; storageIndex++) {
      const storageKey = this.storage.key(storageIndex)
      if (storageKey && storageKey.startsWith(this.prefix)) {
        keysToRemove.push(storageKey)
      }
    }
    
    // Remove them
    keysToRemove.forEach(keyToRemove => this.storage!.removeItem(keyToRemove))
  }
}
