/**
 * Transaction manager for coordinating multi-step operations with rollback support
 * 
 * Implements Requirements 3.1, 3.2, 3.3, 3.4, 3.5: Transaction Management and Rollback
 * Property 11: Upload rollback on DB failure
 * Property 12: DB preservation on storage failure
 * Property 13: File move rollback
 * Property 14: Transaction step tracking
 * Property 15: Rollback failure notification
 * 
 * @module TransactionManager
 */

/**
 * Represents a single step in a transaction
 * Each step must provide both an execute and rollback function
 */
export interface TransactionStep {
  /**
   * Unique name for this step (used in logging and error messages)
   */
  name: string

  /**
   * Function to execute this step
   * Should throw an error if the step fails
   */
  execute: () => Promise<void>

  /**
   * Function to rollback this step
   * Called in reverse order if any step fails
   * Should throw an error if rollback fails
   */
  rollback: () => Promise<void>
}

/**
 * Result of a rollback operation
 */
export interface RollbackResult {
  /**
   * Whether the rollback completed successfully
   */
  success: boolean

  /**
   * Errors that occurred during rollback (if any)
   */
  errors: Array<{ step: string; error: string }>
}

/**
 * Manages multi-step transactions with automatic rollback on failure
 * 
 * Implements Property 14: Transaction step tracking
 * For any multi-step operation, the transaction manager should track 
 * all completed steps in order for potential rollback.
 * 
 * Implements Property 15: Rollback failure notification
 * For any rollback operation that fails, the system should log the failure 
 * and notify the user about manual cleanup requirements.
 * 
 * @example
 * ```typescript
 * const transaction = new TransactionManager()
 * const uploadedFiles: string[] = []
 * 
 * // Step 1: Upload files
 * transaction.addStep({
 *   name: 'upload-files',
 *   execute: async () => {
 *     for (const file of files) {
 *       await storage.upload(file)
 *       uploadedFiles.push(file.path)
 *     }
 *   },
 *   rollback: async () => {
 *     await storage.deleteFiles(uploadedFiles)
 *   }
 * })
 * 
 * // Step 2: Create DB record
 * transaction.addStep({
 *   name: 'create-record',
 *   execute: async () => {
 *     await db.insert(record)
 *   },
 *   rollback: async () => {
 *     // DB record creation failed, no rollback needed
 *   }
 * })
 * 
 * // Execute transaction (automatically rolls back on failure)
 * await transaction.execute()
 * ```
 */
export class TransactionManager {
  /**
   * All steps that have been added to this transaction
   */
  private steps: TransactionStep[] = []

  /**
   * Steps that have been successfully executed
   * Tracked in order for rollback purposes
   */
  private executedSteps: TransactionStep[] = []

  /**
   * Whether the transaction is currently executing
   */
  private isExecuting: boolean = false

  /**
   * Adds a step to the transaction
   * Steps are executed in the order they are added
   * 
   * @param step - The transaction step to add
   * @throws Error if transaction is currently executing
   */
  addStep(step: TransactionStep): void {
    if (this.isExecuting) {
      throw new Error('Cannot add steps while transaction is executing')
    }

    this.steps.push(step)
  }

  /**
   * Executes all transaction steps in order
   * If any step fails, automatically rolls back all executed steps
   * 
   * Implements Property 11: Upload rollback on DB failure
   * For any magazine upload, if database insertion fails after files are uploaded,
   * all uploaded files should be automatically deleted from storage.
   * 
   * Implements Property 13: File move rollback
   * For any magazine rename operation, if file moves fail at any point,
   * all previously moved files should be rolled back to their original locations.
   * 
   * @throws Error if any step fails (after rollback is attempted)
   */
  async execute(): Promise<void> {
    if (this.isExecuting) {
      throw new Error('Transaction is already executing')
    }

    this.isExecuting = true
    this.executedSteps = []

    try {
      // Execute each step in order
      for (const step of this.steps) {
        try {
          await step.execute()
          this.executedSteps.push(step)
        } catch (error) {
          // Step failed - rollback and rethrow
          const rollbackResult = await this.rollback()
          
          // Create error message with rollback information
          const errorMessage = error instanceof Error ? error.message : String(error)
          const rollbackInfo = rollbackResult.success
            ? 'All changes have been rolled back successfully.'
            : `Rollback completed with errors. Manual cleanup may be required: ${
                rollbackResult.errors.map(rollbackError => `${rollbackError.step}: ${rollbackError.error}`).join(', ')
              }`
          
          throw new Error(
            `Transaction failed at step "${step.name}": ${errorMessage}. ${rollbackInfo}`
          )
        }
      }
    } finally {
      this.isExecuting = false
    }
  }

  /**
   * Rolls back all executed steps in reverse order
   * 
   * Implements Property 15: Rollback failure notification
   * For any rollback operation that fails, the system should log the failure
   * and notify the user about manual cleanup requirements.
   * 
   * @returns Result indicating success and any errors that occurred
   */
  async rollback(): Promise<RollbackResult> {
    const errors: Array<{ step: string; error: string }> = []

    // Rollback in reverse order
    const stepsToRollback = [...this.executedSteps].reverse()

    for (const step of stepsToRollback) {
      try {
        await step.rollback()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push({
          step: step.name,
          error: errorMessage
        })
      }
    }

    return {
      success: errors.length === 0,
      errors
    }
  }

  /**
   * Gets the names of all steps in this transaction
   */
  getSteps(): string[] {
    return this.steps.map(step => step.name)
  }

  /**
   * Gets the names of all executed steps
   */
  getExecutedSteps(): string[] {
    return this.executedSteps.map(step => step.name)
  }

  /**
   * Resets the transaction manager to its initial state
   * Clears all steps and executed steps
   */
  reset(): void {
    if (this.isExecuting) {
      throw new Error('Cannot reset while transaction is executing')
    }

    this.steps = []
    this.executedSteps = []
  }
}

/**
 * Error thrown when a transaction fails
 * Includes information about which step failed and rollback status
 */
export class TransactionError extends Error {
  constructor(
    message: string,
    public failedStep: string,
    public rollbackSuccess: boolean,
    public rollbackErrors: Array<{ step: string; error: string }> = []
  ) {
    super(message)
    this.name = 'TransactionError'
  }
}
