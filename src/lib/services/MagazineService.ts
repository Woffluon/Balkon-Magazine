/**
 * Magazine Service with Transaction Support
 *
 * Provides magazine operations with:
 * - Input validation using Zod schemas
 * - Transaction management with rollback support
 * - Optimistic locking for concurrent operations
 * - Uniqueness checks for data integrity
 * - Typed AppError reporting for reliable client-side recovery
 *
 * @module MagazineService
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'
import { TransactionManager } from './TransactionManager'
import { StorageService } from './storage/StorageService'
import { StorageFactory } from './storage/StorageFactory'
import { executeSupabaseQuery } from '@/lib/utils/supabaseClientUtils'
import { executeAsyncOperation } from '@/lib/utils/asyncPatterns'
import {
  MagazineInputSchema,
  MagazineRenameSchema,
  MagazineDeleteSchema,
  type MagazineInput,
  type MagazineRenameInput,
  type MagazineDeleteInput,
} from '@/lib/validators/magazineSchemas'
import type { Magazine } from '@/types/magazine'
import { STORAGE_CONFIG } from '@/lib/constants/storage'
import { AppError, DatabaseError, StorageError, ValidationError } from '@/lib/errors/AppError'
import { ErrorHandler } from '@/lib/errors/errorHandler'
import { t } from '@/lib/i18n'
import { performanceMonitor } from './PerformanceMonitor'
import { logger } from './Logger'

function createVersionConflictError(details?: unknown): DatabaseError {
  const err = new DatabaseError(
    'Magazine record modified by another operation',
    'update',
    'magazines',
    t('errors.conflict'),
    false,
    details,
    'DB_VERSION_CONFLICT'
  )
  err.statusCode = 409
  return err
}

function createDuplicateIssueError(
  issueNumber: number,
  operation: 'insert' | 'update'
): DatabaseError {
  const err = new DatabaseError(
    `Duplicate issue number: ${issueNumber}`,
    operation,
    'magazines',
    `Sayı ${issueNumber} zaten mevcut. Farklı bir sayı numarası seçin.`,
    false,
    { issue_number: issueNumber },
    'DATABASE_DUPLICATE_ENTRY'
  )
  err.statusCode = 409
  return err
}

export class MagazineService {
  private storage: StorageService

  constructor(
    private supabase: SupabaseClient,
    storage?: StorageService
  ) {
    this.storage = storage ?? new StorageService(StorageFactory.getStorageService(supabase))
  }

  /**
   * Validates input data against a Zod schema and throws ValidationError on failure
   */
  private validateInput<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
    try {
      return schema.parse(data)
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0]
        const field = firstIssue?.path.map(String).join('.') || 'input'
        const userMessage = firstIssue?.message || 'Girilen bilgiler geçersiz. Lütfen kontrol edip tekrar deneyin.'
        throw new ValidationError(
          `Validation failed for ${field}: ${userMessage}`,
          field,
          firstIssue?.code ?? 'invalid_input',
          userMessage,
          { zodError: error.issues }
        )
      }
      if (error && typeof error === 'object' && 'errors' in error) {
        const zodLike = error as { errors: Array<{ path: string[]; message: string }> }
        const first = zodLike.errors[0]
        const field = first?.path?.join('.') || 'input'
        const userMessage = first?.message || 'Girilen bilgiler geçersiz. Lütfen kontrol edip tekrar deneyin.'
        throw new ValidationError(
          `Validation failed: ${userMessage}`,
          field,
          'invalid_input',
          userMessage
        )
      }
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen doğrulama hatası'
      throw new ValidationError(
        `Validation failed: ${errorMessage}`,
        'input',
        'invalid_input',
        'Girilen bilgiler geçersiz. Lütfen kontrol edip tekrar deneyin.'
      )
    }
  }

  /**
   * Checks if a magazine with the given issue number already exists
   */
  private async checkIssueNumberExists(
    issueNumber: number,
    excludeId?: string
  ): Promise<boolean> {
    const result = await executeAsyncOperation(
      async () => {
        return await executeSupabaseQuery(
          this.supabase,
          async (supabase) => {
            let query = supabase
              .from('magazines')
              .select('id')
              .eq('issue_number', issueNumber)

            if (excludeId) {
              query = query.neq('id', excludeId)
            }

            return await query.single()
          },
          {
            operation: 'checkIssueNumberExists',
            component: 'MagazineService',
            expectData: false,
            allowEmpty: true,
          }
        )
      },
      {
        operation: 'checkIssueNumberExists',
        component: 'MagazineService',
        issueNumber,
        excludeId,
      }
    )

    if (!result.success) {
      const details = result.error.details as { originalError?: { code?: string } } | undefined
      const error = details?.originalError
      if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
        return false
      }
      throw result.error
    }

    return result.data !== null
  }

  /**
   * Gets the current version of a magazine for optimistic locking
   */
  private async getMagazineWithVersion(id: string): Promise<Magazine> {
    const result = await executeAsyncOperation(
      async () => {
        return await executeSupabaseQuery(
          this.supabase,
          async (supabase) =>
            supabase
              .from('magazines')
              .select('*')
              .eq('id', id)
              .single(),
          {
            operation: 'getMagazineWithVersion',
            component: 'MagazineService',
            expectData: true,
          }
        )
      },
      {
        operation: 'getMagazineWithVersion',
        component: 'MagazineService',
        magazineId: id,
      }
    )

    if (!result.success) {
      throw result.error
    }

    if (!result.data) {
      const notFoundError = new DatabaseError(
        `Magazine not found: ${id}`,
        'select',
        'magazines',
        'Aradığınız dergi kaydı bulunamadı.',
        false,
        { id },
        'DATABASE_NOT_FOUND'
      )
      notFoundError.statusCode = 404
      throw notFoundError
    }

    return result.data as Magazine
  }

  /**
   * Creates a new magazine record
   */
  async createMagazine(input: unknown): Promise<Magazine> {
    return performanceMonitor.measure('createMagazine', async () => {
      logger.info('Creating magazine', { input })

      const validated = this.validateInput<MagazineInput>(
        MagazineInputSchema,
        input
      )

      const exists = await this.checkIssueNumberExists(validated.issue_number)

      if (exists) {
        logger.warn('Magazine creation failed: duplicate issue number', {
          issue_number: validated.issue_number,
        })
        throw createDuplicateIssueError(validated.issue_number, 'insert')
      }

      const { data, error } = await this.supabase
        .from('magazines')
        .insert({
          ...validated,
          is_published: true,
          version: 1,
        })
        .select()
        .single()

      if (error) {
        logger.error('Magazine creation failed: database error', {
          error: error.message,
          issue_number: validated.issue_number,
        })
        throw ErrorHandler.handleSupabaseError(error, 'insert', 'magazines')
      }

      logger.info('Magazine created successfully', {
        id: data.id,
        issue_number: data.issue_number,
      })

      return data as Magazine
    })
  }

  /**
   * Uploads magazine files and creates database record with transaction support
   */
  async uploadMagazineWithFiles(
    magazineData: unknown,
    files: Array<{ path: string; file: File }>
  ): Promise<Magazine> {
    return performanceMonitor.measure('uploadMagazineWithFiles', async () => {
      const totalSize = files.reduce((sum, { file }) => sum + file.size, 0)

      logger.info('Starting magazine upload', {
        fileCount: files.length,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      })

      const transaction = new TransactionManager()
      const uploadedFiles: string[] = []
      let createdMagazine: Magazine | null = null
      let stepError: AppError | null = null

      transaction.addStep({
        name: 'upload-files',
        execute: async () => {
          try {
            for (const { path, file } of files) {
              await this.storage.uploadFile(STORAGE_CONFIG.BUCKET, path, file)
              uploadedFiles.push(path)
            }
            logger.info('Files uploaded successfully', {
              fileCount: uploadedFiles.length,
            })
          } catch (error) {
            stepError = error instanceof AppError
              ? error
              : ErrorHandler.handleStorageError(
                  error instanceof Error ? error : { message: String(error) },
                  'upload'
                )
            throw stepError
          }
        },
        rollback: async () => {
          if (uploadedFiles.length > 0) {
            logger.warn('Rolling back file uploads', {
              fileCount: uploadedFiles.length,
            })
            await this.storage.deleteFiles(STORAGE_CONFIG.BUCKET, uploadedFiles)
          }
        },
      })

      transaction.addStep({
        name: 'create-record',
        execute: async () => {
          try {
            createdMagazine = await this.createMagazine(magazineData)
          } catch (error) {
            stepError = ErrorHandler.handleUnknownError(error)
            throw stepError
          }
        },
        rollback: async () => {
          // DB record creation failed, no rollback needed
        },
      })

      try {
        await transaction.execute()
      } catch (error) {
        if (stepError) {
          throw stepError
        }
        throw ErrorHandler.handleUnknownError(error)
      }

      if (!createdMagazine) {
        logger.error('Magazine upload failed: no magazine created')
        throw new DatabaseError(
          'Magazine upload completed transaction without created record',
          'insert',
          'magazines',
          'Dergi kaydı oluşturulamadı. Lütfen tekrar deneyin.',
          true,
          undefined,
          'DATABASE_CREATE_FAILED'
        )
      }

      const magazine: Magazine = createdMagazine

      logger.info('Magazine upload completed successfully', {
        id: magazine.id,
        issue_number: magazine.issue_number,
        fileCount: files.length,
      })

      return magazine
    })
  }

  /**
   * Renames a magazine with optimistic locking and transaction support
   */
  async renameMagazine(input: unknown): Promise<Magazine> {
    return performanceMonitor.measure('renameMagazine', async () => {
      logger.info('Starting magazine rename', { input })

      const validated = this.validateInput<MagazineRenameInput>(
        MagazineRenameSchema,
        input
      )

      const current = await this.getMagazineWithVersion(validated.id)

      if (current.version !== validated.version) {
        logger.warn('Magazine rename failed: version conflict', {
          id: validated.id,
          expectedVersion: validated.version,
          currentVersion: current.version,
        })
        throw createVersionConflictError({
          id: validated.id,
          expectedVersion: validated.version,
          currentVersion: current.version,
        })
      }

      if (validated.new_issue !== validated.old_issue) {
        const exists = await this.checkIssueNumberExists(
          validated.new_issue,
          validated.id
        )

        if (exists) {
          logger.warn('Magazine rename failed: duplicate issue number', {
            new_issue: validated.new_issue,
          })
          throw createDuplicateIssueError(validated.new_issue, 'update')
        }
      }

      const transaction = new TransactionManager()
      const movedFiles: Array<{ from: string; to: string }> = []
      let updatedMagazine: Magazine | null = null
      let stepError: AppError | null = null

      if (validated.new_issue !== validated.old_issue) {
        transaction.addStep({
          name: 'move-files',
          execute: async () => {
            try {
              const files = await this.storage.listFilesRecursive(
                STORAGE_CONFIG.BUCKET,
                `${validated.old_issue}/pages`
              )

              logger.info('Moving files for rename', {
                fileCount: files.length,
                from: validated.old_issue,
                to: validated.new_issue,
              })

              const moves = files.map((file) => ({
                from: file,
                to: file.replace(
                  `${validated.old_issue}/`,
                  `${validated.new_issue}/`
                ),
              }))

              await this.storage.moveFiles(STORAGE_CONFIG.BUCKET, moves)
              movedFiles.push(...moves)

              logger.info('Files moved successfully', {
                fileCount: movedFiles.length,
              })
            } catch (error) {
              stepError = error instanceof AppError
                ? error
                : ErrorHandler.handleStorageError(
                    error instanceof Error ? error : { message: String(error) },
                    'move'
                  )
              throw stepError
            }
          },
          rollback: async () => {
            if (movedFiles.length > 0) {
              logger.warn('Rolling back file moves', {
                fileCount: movedFiles.length,
              })
              const reverseMoves = movedFiles.map(({ from, to }) => ({
                from: to,
                to: from,
              }))
              await this.storage.moveFiles(STORAGE_CONFIG.BUCKET, reverseMoves)
            }
          },
        })
      }

      transaction.addStep({
        name: 'update-db',
        execute: async () => {
          const update: {
            issue_number: number
            version: number
            title?: string
          } = {
            issue_number: validated.new_issue,
            version: validated.version + 1,
          }

          if (validated.new_title) {
            update.title = validated.new_title
          }

          const { data, error } = await this.supabase
            .from('magazines')
            .update(update)
            .eq('id', validated.id)
            .eq('version', validated.version)
            .select()
            .single()

          if (error) {
            logger.error('Magazine rename failed: database update error', {
              error: error.message,
              code: error.code,
              id: validated.id,
            })
            stepError = error.code === 'PGRST116'
              ? createVersionConflictError({
                  id: validated.id,
                  expectedVersion: validated.version,
                })
              : ErrorHandler.handleSupabaseError(error, 'update', 'magazines')
            throw stepError
          }

          if (!data) {
            logger.warn('Magazine rename failed: version conflict during update', {
              id: validated.id,
            })
            stepError = createVersionConflictError({
              id: validated.id,
              expectedVersion: validated.version,
            })
            throw stepError
          }

          updatedMagazine = data as Magazine
        },
        rollback: async () => {
          // DB update failed, no rollback needed
        },
      })

      try {
        await transaction.execute()
      } catch (error) {
        if (stepError) {
          throw stepError
        }
        throw ErrorHandler.handleUnknownError(error)
      }

      if (!updatedMagazine) {
        logger.error('Magazine rename failed: no magazine updated')
        throw new DatabaseError(
          'Magazine rename finished without updated row',
          'update',
          'magazines',
          'Dergi bilgileri güncellenemedi. Lütfen tekrar deneyin.',
          true,
          { id: validated.id },
          'DATABASE_UPDATE_FAILED'
        )
      }

      const magazine: Magazine = updatedMagazine

      logger.info('Magazine rename completed successfully', {
        id: magazine.id,
        old_issue: validated.old_issue,
        new_issue: validated.new_issue,
        newVersion: magazine.version,
      })

      return magazine
    })
  }

  /**
   * Deletes a magazine with storage-first approach
   */
  async deleteMagazine(input: unknown): Promise<void> {
    return performanceMonitor.measure('deleteMagazine', async () => {
      logger.info('Starting magazine deletion', { input })

      const validated = this.validateInput<MagazineDeleteInput>(
        MagazineDeleteSchema,
        input
      )

      const files = await this.storage.listFilesRecursive(
        STORAGE_CONFIG.BUCKET,
        String(validated.issue_number)
      )

      logger.info('Deleting storage files', {
        fileCount: files.length,
        issue_number: validated.issue_number,
      })

      if (files.length > 0) {
        try {
          await this.storage.deleteFiles(STORAGE_CONFIG.BUCKET, files)
          logger.info('Storage files deleted successfully', {
            fileCount: files.length,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          logger.error('Magazine deletion failed: storage deletion error', {
            error: errorMessage,
            issue_number: validated.issue_number,
            fileCount: files.length,
          })
          throw new StorageError(
            `Storage files could not be deleted: ${errorMessage}`,
            'delete',
            String(validated.issue_number),
            'Depolama dosyaları silinemedi. Dergi kaydı korundu; lütfen tekrar deneyin.',
            true,
            { originalError: error, issueNumber: validated.issue_number },
            'STORAGE_DELETE_FAILED'
          )
        }
      }

      const { error } = await this.supabase
        .from('magazines')
        .delete()
        .eq('id', validated.id)

      if (error) {
        logger.error('Magazine deletion failed: database deletion error', {
          error: error.message,
          id: validated.id,
          issue_number: validated.issue_number,
        })
        throw new DatabaseError(
          `Database deletion failed after storage cleanup: ${error.message}`,
          'delete',
          'magazines',
          'Depolama dosyaları kaldırıldı ancak veritabanı kaydı silinemedi. Sayfayı yenileyip kontrol edin.',
          false,
          {
            originalError: error,
            id: validated.id,
            issueNumber: validated.issue_number,
            cleanup: true,
          },
          'OPERATION_DELETE_PARTIAL_FAILURE'
        )
      }

      logger.info('Magazine deletion completed successfully', {
        id: validated.id,
        issue_number: validated.issue_number,
      })
    })
  }
}
