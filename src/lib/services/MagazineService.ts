import type { Magazine } from '@/types/magazine'
import type { CreateMagazineDto, UpdateMagazineDto } from '@/types/dtos'
import type { IMagazineRepository } from '@/lib/repositories/IMagazineRepository'
import type { IStorageService } from '@/lib/services/storage/IStorageService'
import type { StorageFile } from '@/types/storage'
import { STORAGE_PATHS } from '@/lib/constants/storage'

/**
 * Magazine Service
 * 
 * Business logic layer for magazine operations.
 * Orchestrates repository and storage service interactions.
 * 
 * @example
 * ```typescript
 * const service = new MagazineService(repository, storageService)
 * const magazines = await service.getAllMagazines()
 * await service.deleteMagazine(id, issueNumber)
 * ```
 */
export class MagazineService {
  constructor(
    private magazineRepository: IMagazineRepository,
    private storageService: IStorageService
  ) {}

  /**
   * Retrieves all magazines
   * 
   * @returns Promise resolving to array of magazines
   * @throws {DatabaseError} If database query fails
   */
  async getAllMagazines(): Promise<Magazine[]> {
    return await this.magazineRepository.findAll()
  }

  /**
   * Finds a magazine by issue number
   * 
   * @param issueNumber - The issue number to search for
   * @returns Promise resolving to magazine or null if not found
   * @throws {DatabaseError} If database query fails
   */
  async getMagazineByIssue(issueNumber: number): Promise<Magazine | null> {
    return await this.magazineRepository.findByIssue(issueNumber)
  }

  /**
   * Creates a new magazine record
   * 
   * @param data - Magazine data to create
   * @returns Promise resolving to created magazine
   * @throws {DatabaseError} If creation fails
   */
  async createMagazine(data: CreateMagazineDto): Promise<Magazine> {
    return await this.magazineRepository.create(data)
  }

  /**
   * Deletes a magazine and all its associated storage files
   * 
   * Implements transactional consistency (Requirements 1.6, 6.4):
   * - Storage-first, database-second pattern
   * - Rollback logic if storage deletion fails
   * - Tracks partial failures
   * - Returns detailed error responses
   * - Logs all operations with context
   * 
   * @param id - The magazine ID to delete
   * @param issueNumber - The issue number for storage cleanup
   * @returns Promise resolving when deletion is complete
   * @throws {DatabaseError} If database deletion fails
   * @throws {StorageError} If storage deletion fails
   */
  async deleteMagazine(id: string, issueNumber: number): Promise<void> {
    const { logger } = await import('@/lib/services/Logger')
    
    logger.info('Starting magazine deletion', {
      operation: 'deleteMagazine',
      magazineId: id,
      issueNumber
    })
    
    // Step 1: List all files to be deleted (for tracking)
    let filesToDelete: StorageFile[] = []
    try {
      filesToDelete = await this.listAllIssueFiles(issueNumber)
      logger.debug('Listed files for deletion', {
        operation: 'deleteMagazine',
        magazineId: id,
        issueNumber,
        fileCount: filesToDelete.length,
        files: filesToDelete.map(f => f.path)
      })
    } catch (error) {
      logger.error('Failed to list files for deletion', {
        operation: 'deleteMagazine',
        magazineId: id,
        issueNumber,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
    
    // Step 2: Delete storage files first (storage-first pattern)
    // This ensures we don't have orphaned database records pointing to deleted files
    try {
      await this.deleteIssueFiles(issueNumber)
      logger.info('Successfully deleted storage files', {
        operation: 'deleteMagazine',
        magazineId: id,
        issueNumber,
        deletedFileCount: filesToDelete.length
      })
    } catch (storageError) {
      // Storage deletion failed - log detailed error and abort
      // Do NOT proceed to database deletion to maintain consistency
      logger.error('Storage deletion failed - aborting magazine deletion', {
        operation: 'deleteMagazine',
        magazineId: id,
        issueNumber,
        fileCount: filesToDelete.length,
        error: storageError instanceof Error ? storageError.message : String(storageError),
        stack: storageError instanceof Error ? storageError.stack : undefined
      })
      
      // Re-throw the storage error to prevent database deletion
      throw storageError
    }
    
    // Step 3: Delete database record (only if storage deletion succeeded)
    try {
      await this.magazineRepository.delete(id)
      logger.info('Successfully deleted magazine from database', {
        operation: 'deleteMagazine',
        magazineId: id,
        issueNumber
      })
    } catch (databaseError) {
      // Database deletion failed after storage deletion succeeded
      // This is a critical inconsistency - storage is deleted but database record remains
      logger.error('Database deletion failed after storage deletion - INCONSISTENT STATE', {
        operation: 'deleteMagazine',
        magazineId: id,
        issueNumber,
        deletedFiles: filesToDelete.map(f => f.path),
        error: databaseError instanceof Error ? databaseError.message : String(databaseError),
        stack: databaseError instanceof Error ? databaseError.stack : undefined,
        severity: 'critical',
        requiresManualIntervention: true
      })
      
      // Note: We cannot rollback storage deletion easily in Supabase
      // The database record will remain but files are gone
      // This should be rare and requires manual intervention
      throw databaseError
    }
    
    logger.info('Magazine deletion completed successfully', {
      operation: 'deleteMagazine',
      magazineId: id,
      issueNumber,
      deletedFileCount: filesToDelete.length
    })
  }

  /**
   * Renames a magazine by moving its storage files and updating the database
   * 
   * Implements comprehensive error handling (Requirements 1.7, 5.3, 6.5):
   * - Wraps entire operation in try-catch
   * - Tracks individual file operation results
   * - Uses Promise.allSettled for parallel operations
   * - Returns detailed failure reports
   * - Implements partial success handling
   * 
   * @param id - The magazine ID to update
   * @param oldIssue - The current issue number
   * @param newIssue - The new issue number
   * @param newTitle - Optional new title for the magazine
   * @returns Promise resolving to updated magazine
   * @throws {DatabaseError} If database update fails
   * @throws {StorageError} If storage operations fail with detailed failure information
   */
  async renameMagazine(
    id: string,
    oldIssue: number,
    newIssue: number,
    newTitle?: string
  ): Promise<Magazine> {
    const { logger } = await import('@/lib/services/Logger')
    
    logger.info('Starting magazine rename operation', {
      operation: 'renameMagazine',
      magazineId: id,
      oldIssue,
      newIssue,
      newTitle
    })
    
    try {
      // Move storage files with detailed tracking
      const moveResults = await this.moveIssueFiles(oldIssue, newIssue)
      
      // Check if any files failed to move
      const totalFiles = moveResults.successes.length + moveResults.failures.length
      if (moveResults.failures.length > 0) {
        logger.warn('Some files failed to move during rename', {
          operation: 'renameMagazine',
          magazineId: id,
          oldIssue,
          newIssue,
          successCount: moveResults.successes.length,
          failureCount: moveResults.failures.length,
          failures: moveResults.failures
        })
        
        // If all files failed, throw error with progress indication
        if (moveResults.successes.length === 0) {
          const { StorageError } = await import('@/lib/errors/AppError')
          const { getErrorEntry } = await import('@/lib/constants/errorCatalog')
          const catalogEntry = getErrorEntry('STORAGE_MOVE_FAILED')
          
          throw new StorageError(
            `Failed to move any files from issue ${oldIssue} to ${newIssue}`,
            'move',
            `${oldIssue}`,
            `Yeniden adlandırma başarısız oldu. ${moveResults.failures.length} dosyanın hiçbiri taşınamadı. (0/${totalFiles} tamamlandı)`,
            catalogEntry.isRetryable,
            { 
              failures: moveResults.failures,
              progress: {
                total: totalFiles,
                completed: 0,
                failed: moveResults.failures.length
              }
            },
            'OPERATION_RENAME_PARTIAL_FAILURE'
          )
        }
        
        // If some files failed, create partial failure error with progress indication
        const { StorageError } = await import('@/lib/errors/AppError')
        const { getErrorEntry } = await import('@/lib/constants/errorCatalog')
        const catalogEntry = getErrorEntry('OPERATION_RENAME_PARTIAL_FAILURE')
        
        throw new StorageError(
          `Failed to move ${moveResults.failures.length} of ${totalFiles} files from issue ${oldIssue} to ${newIssue}`,
          'move',
          `${oldIssue}`,
          `Yeniden adlandırma kısmen tamamlandı. ${moveResults.successes.length} dosya taşındı, ${moveResults.failures.length} dosya taşınamadı. (${moveResults.successes.length}/${totalFiles} tamamlandı)`,
          catalogEntry.isRetryable,
          {
            totalFiles,
            successCount: moveResults.successes.length,
            failureCount: moveResults.failures.length,
            successes: moveResults.successes,
            failures: moveResults.failures,
            progress: {
              total: totalFiles,
              completed: moveResults.successes.length,
              failed: moveResults.failures.length
            }
          },
          'OPERATION_RENAME_PARTIAL_FAILURE'
        )
      }
      
      // Update database record
      const updateData: UpdateMagazineDto = { issue_number: newIssue }
      if (newTitle) {
        updateData.title = newTitle
      }
      
      const updatedMagazine = await this.magazineRepository.update(id, updateData)
      
      logger.info('Magazine rename completed', {
        operation: 'renameMagazine',
        magazineId: id,
        oldIssue,
        newIssue,
        filesMovedSuccessfully: moveResults.successes.length,
        filesFailed: moveResults.failures.length
      })
      
      return updatedMagazine
    } catch (error) {
      logger.error('Magazine rename operation failed', {
        operation: 'renameMagazine',
        magazineId: id,
        oldIssue,
        newIssue,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      
      throw error
    }
  }

  /**
   * Deletes all storage files for a magazine issue
   * 
   * Implements Requirement 6.3: Partial storage failures retry selectively
   * - Tracks successful vs failed operations
   * - Only retries failed operations
   * - Preserves successful operation results
   * - Returns combined results
   * 
   * @param issueNumber - The issue number
   * @returns Promise resolving when deletion is complete
   * @throws {StorageError} If deletion fails completely or partially
   */
  private async deleteIssueFiles(issueNumber: number): Promise<void> {
    const { logger } = await import('@/lib/services/Logger')
    const files = await this.listAllIssueFiles(issueNumber)
    
    if (files.length === 0) {
      logger.debug('No files to delete', {
        operation: 'deleteIssueFiles',
        issueNumber
      })
      return
    }
    
    const filePaths = files.map(f => f.path)
    
    logger.info('Starting file deletion with partial retry', {
      operation: 'deleteIssueFiles',
      issueNumber,
      fileCount: filePaths.length
    })
    
    // Use partial retry to handle individual file failures
    const result = await this.storageService.deleteWithPartialRetry(filePaths, {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffMultiplier: 2
    })
    
    // Log results
    if (result.failures.length > 0) {
      logger.warn('Some files failed to delete', {
        operation: 'deleteIssueFiles',
        issueNumber,
        totalFiles: filePaths.length,
        successCount: result.successes.length,
        failureCount: result.failures.length,
        failures: result.failures
      })
      
      // If all files failed, throw error with progress indication
      if (result.successes.length === 0) {
        const { StorageError } = await import('@/lib/errors/AppError')
        const { getErrorEntry } = await import('@/lib/constants/errorCatalog')
        const catalogEntry = getErrorEntry('STORAGE_DELETE_FAILED')
        
        throw new StorageError(
          `Failed to delete any files for issue ${issueNumber}`,
          'delete',
          String(issueNumber),
          `Silme işlemi başarısız oldu. ${result.failures.length} dosyanın hiçbiri silinemedi. (0/${filePaths.length} tamamlandı)`,
          catalogEntry.isRetryable,
          { 
            failures: result.failures,
            progress: {
              total: filePaths.length,
              completed: 0,
              failed: result.failures.length
            }
          },
          'OPERATION_DELETE_PARTIAL_FAILURE'
        )
      }
      
      // If some files failed, throw error with partial success info and progress indication
      const { StorageError } = await import('@/lib/errors/AppError')
      const { getErrorEntry } = await import('@/lib/constants/errorCatalog')
      const catalogEntry = getErrorEntry('OPERATION_DELETE_PARTIAL_FAILURE')
      
      throw new StorageError(
        `Failed to delete ${result.failures.length} of ${filePaths.length} files for issue ${issueNumber}`,
        'delete',
        String(issueNumber),
        `Silme işlemi kısmen tamamlandı. ${result.successes.length} dosya silindi, ${result.failures.length} dosya silinemedi. (${result.successes.length}/${filePaths.length} tamamlandı)`,
        catalogEntry.isRetryable,
        {
          totalFiles: filePaths.length,
          successCount: result.successes.length,
          failureCount: result.failures.length,
          failures: result.failures,
          progress: {
            total: filePaths.length,
            completed: result.successes.length,
            failed: result.failures.length
          }
        },
        'OPERATION_DELETE_PARTIAL_FAILURE'
      )
    }
    
    logger.info('Successfully deleted all files', {
      operation: 'deleteIssueFiles',
      issueNumber,
      fileCount: result.successes.length
    })
  }

  /**
   * Moves all storage files from one issue number to another
   * 
   * Implements comprehensive error handling (Requirements 1.7, 5.3, 6.5):
   * - Uses Promise.allSettled for parallel operations
   * - Tracks individual file operation results
   * - Returns detailed success/failure information
   * - Handles partial failures gracefully
   * 
   * @param oldIssue - The current issue number
   * @param newIssue - The new issue number
   * @returns Promise resolving to operation results with successes and failures
   */
  private async moveIssueFiles(
    oldIssue: number,
    newIssue: number
  ): Promise<{
    successes: Array<{ from: string; to: string }>
    failures: Array<{ from: string; to: string; error: string }>
  }> {
    const { logger } = await import('@/lib/services/Logger')
    const successes: Array<{ from: string; to: string }> = []
    const failures: Array<{ from: string; to: string; error: string }> = []
    
    // If moving to the same issue number, skip
    if (oldIssue === newIssue) {
      logger.debug('Skipping file move - same issue number', {
        operation: 'moveIssueFiles',
        issueNumber: oldIssue
      })
      return { successes, failures }
    }
    
    logger.info('Starting file move operation', {
      operation: 'moveIssueFiles',
      oldIssue,
      newIssue
    })
    
    // Delete target directory first to avoid conflicts
    try {
      await this.deleteIssueFiles(newIssue)
      logger.debug('Cleaned target directory', {
        operation: 'moveIssueFiles',
        targetIssue: newIssue
      })
    } catch (error) {
      // Ignore errors if target doesn't exist
      logger.debug('Target directory does not exist or could not be cleaned', {
        operation: 'moveIssueFiles',
        targetIssue: newIssue,
        error: error instanceof Error ? error.message : String(error)
      })
    }
    
    // List all files to move
    let pages: StorageFile[] = []
    try {
      const pagesPath = STORAGE_PATHS.getPagesPath(oldIssue)
      pages = await this.storageService.list(pagesPath)
      logger.debug('Listed files to move', {
        operation: 'moveIssueFiles',
        oldIssue,
        pageCount: pages.length
      })
    } catch (error) {
      logger.error('Failed to list files for move', {
        operation: 'moveIssueFiles',
        oldIssue,
        error: error instanceof Error ? error.message : String(error)
      })
      // If we can't list files, we can't proceed
      throw error
    }
    
    // Prepare all move operations
    const moveOperations: Array<{
      from: string
      to: string
      operation: () => Promise<void>
    }> = []
    
    // Add cover image move operation
    // Implements storage error handling (Requirements 1.3):
    // - Wraps storage operations in try-catch
    // - Provides fallback for move operation
    // - Logs errors with context
    const oldCoverPath = STORAGE_PATHS.getCoverPath(oldIssue)
    const newCoverPath = STORAGE_PATHS.getCoverPath(newIssue)
    moveOperations.push({
      from: oldCoverPath,
      to: newCoverPath,
      operation: async () => {
        try {
          await this.storageService.move(oldCoverPath, newCoverPath)
        } catch (moveError) {
          // Fallback to copy + delete if move fails
          logger.debug('Move operation failed, attempting copy + delete fallback', {
            operation: 'moveIssueFiles',
            from: oldCoverPath,
            to: newCoverPath,
            error: moveError instanceof Error ? moveError.message : String(moveError)
          })
          
          try {
            await this.storageService.copy(oldCoverPath, newCoverPath)
            await this.storageService.delete([oldCoverPath])
          } catch (fallbackError) {
            logger.error('Fallback copy + delete also failed', {
              operation: 'moveIssueFiles',
              from: oldCoverPath,
              to: newCoverPath,
              error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
            })
            throw fallbackError
          }
        }
      }
    })
    
    // Add page file move operations
    // Implements storage error handling (Requirements 1.3):
    // - Wraps storage operations in try-catch
    // - Provides fallback for move operation
    // - Logs errors with context
    for (const page of pages) {
      const fromPath = `${oldIssue}/pages/${page.name}`
      const toPath = `${newIssue}/pages/${page.name}`
      moveOperations.push({
        from: fromPath,
        to: toPath,
        operation: async () => {
          try {
            await this.storageService.move(fromPath, toPath)
          } catch (moveError) {
            // Fallback to copy + delete if move fails
            logger.debug('Move operation failed, attempting copy + delete fallback', {
              operation: 'moveIssueFiles',
              from: fromPath,
              to: toPath,
              error: moveError instanceof Error ? moveError.message : String(moveError)
            })
            
            try {
              await this.storageService.copy(fromPath, toPath)
              await this.storageService.delete([fromPath])
            } catch (fallbackError) {
              logger.error('Fallback copy + delete also failed', {
                operation: 'moveIssueFiles',
                from: fromPath,
                to: toPath,
                error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
              })
              throw fallbackError
            }
          }
        }
      })
    }
    
    logger.info('Executing parallel file move operations', {
      operation: 'moveIssueFiles',
      oldIssue,
      newIssue,
      operationCount: moveOperations.length
    })
    
    // Execute all move operations in parallel using Promise.allSettled
    const results = await Promise.allSettled(
      moveOperations.map(op => op.operation())
    )
    
    // Track results for each operation
    results.forEach((result, index) => {
      const { from, to } = moveOperations[index]
      
      if (result.status === 'fulfilled') {
        successes.push({ from, to })
        logger.debug('File moved successfully', {
          operation: 'moveIssueFiles',
          from,
          to
        })
      } else {
        const errorMessage = result.reason instanceof Error 
          ? result.reason.message 
          : String(result.reason)
        
        failures.push({ from, to, error: errorMessage })
        logger.warn('File move failed', {
          operation: 'moveIssueFiles',
          from,
          to,
          error: errorMessage
        })
      }
    })
    
    logger.info('File move operation completed', {
      operation: 'moveIssueFiles',
      oldIssue,
      newIssue,
      totalOperations: moveOperations.length,
      successCount: successes.length,
      failureCount: failures.length
    })
    
    return { successes, failures }
  }

  /**
   * Lists all storage files for a magazine issue recursively
   * 
   * Implements recursive error handling (Requirements 1.4):
   * - Adds depth limit parameter (default 10)
   * - Adds per-directory error handling
   * - Tracks failed directories
   * - Returns partial results on errors
   * - Logs warnings for depth limit and failures
   * 
   * Implements storage error handling (Requirements 1.3):
   * - Wraps storage operations in try-catch
   * - Handles StorageError instances appropriately
   * - Provides context for each operation
   * 
   * @param issueNumber - The issue number
   * @param maxDepth - Maximum recursion depth (default 10)
   * @returns Promise resolving to array of storage files (partial results if errors occur)
   * @throws {StorageError} If listing fails completely
   */
  private async listAllIssueFiles(
    issueNumber: number,
    maxDepth: number = 10
  ): Promise<StorageFile[]> {
    const { logger } = await import('@/lib/services/Logger')
    const { ErrorHandler } = await import('@/lib/errors/errorHandler')
    const files: StorageFile[] = []
    const failedDirectories: Array<{ path: string; error: string }> = []
    const issuePrefix = String(issueNumber)
    
    logger.debug('Starting recursive file listing', {
      operation: 'listAllIssueFiles',
      issueNumber,
      maxDepth,
      prefix: issuePrefix
    })
    
    const listRecursive = async (prefix: string, currentDepth: number): Promise<void> => {
      // Check depth limit
      if (currentDepth > maxDepth) {
        const warningMessage = `Depth limit (${maxDepth}) exceeded for path: ${prefix}`
        logger.warn(warningMessage, {
          operation: 'listAllIssueFiles',
          issueNumber,
          prefix,
          currentDepth,
          maxDepth
        })
        failedDirectories.push({
          path: prefix,
          error: `Depth limit exceeded (max: ${maxDepth})`
        })
        return
      }
      
      // Per-directory error handling with storage operation wrapped in try-catch
      try {
        const items = await this.storageService.list(prefix)
        
        logger.debug('Listed directory contents', {
          operation: 'listAllIssueFiles',
          prefix,
          itemCount: items.length,
          depth: currentDepth
        })
        
        for (const item of items) {
          if (item.id) {
            // It's a file
            files.push(item)
          } else {
            // It's a directory, recurse into it
            await listRecursive(item.path, currentDepth + 1)
          }
        }
      } catch (error) {
        // Transform to StorageError if not already
        const storageError = ErrorHandler.handleStorageError(
          error instanceof Error ? error : new Error(String(error)),
          'list',
          prefix
        )
        
        // Log per-directory failure but continue with other directories
        logger.warn('Failed to list directory, continuing with partial results', {
          operation: 'listAllIssueFiles',
          issueNumber,
          prefix,
          depth: currentDepth,
          error: storageError.message,
          code: storageError.code
        })
        
        failedDirectories.push({
          path: prefix,
          error: storageError.message
        })
      }
    }
    
    // Start recursive listing from depth 0
    await listRecursive(issuePrefix, 0)
    
    // Log summary of operation
    if (failedDirectories.length > 0) {
      logger.warn('Recursive file listing completed with failures', {
        operation: 'listAllIssueFiles',
        issueNumber,
        filesFound: files.length,
        failedDirectoryCount: failedDirectories.length,
        failedDirectories
      })
    } else {
      logger.debug('Recursive file listing completed successfully', {
        operation: 'listAllIssueFiles',
        issueNumber,
        filesFound: files.length
      })
    }
    
    return files
  }
}
