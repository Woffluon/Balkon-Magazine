/**
 * Magazine Service with Transaction Support
 * 
 * Implements Requirements 2.1, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 5.5, 8.1, 8.2, 8.4
 * 
 * This service provides magazine operations with:
 * - Input validation using Zod schemas
 * - Transaction management with rollback support
 * - Optimistic locking for concurrent operations
 * - Uniqueness checks for data integrity
 * - Proper error handling and reporting
 * 
 * @module MagazineService
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { TransactionManager } from './TransactionManager'
import { StorageService } from './storage/StorageService'
import {
  MagazineInputSchema,
  MagazineRenameSchema,
  MagazineDeleteSchema,
  type MagazineInput,
  type MagazineRenameInput,
  type MagazineDeleteInput
} from '@/lib/validators/magazineSchemas'
import type { Magazine } from '@/types/magazine'
import { STORAGE_CONFIG } from '@/lib/constants/storage'
import { performanceMonitor } from './PerformanceMonitor'
import { logger } from './Logger'

/**
 * Magazine Service Implementation with Transaction Support
 * 
 * Provides robust magazine operations with validation, transactions,
 * optimistic locking, and proper error handling.
 */
export class MagazineService {
  private storage: StorageService

  constructor(
    private supabase: SupabaseClient,
    storage?: StorageService
  ) {
    this.storage = storage ?? new StorageService(supabase)
  }

  /**
   * Validates input data against a Zod schema
   */
  private validateInput<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
    try {
      return schema.parse(data)
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errors' in error) {
        const zodError = error as { errors: Array<{ path: string[]; message: string }> }
        const messages = zodError.errors.map((e) => 
          `${e.path.join('.')}: ${e.message}`
        ).join(', ')
        throw new Error(`Doğrulama hatası: ${messages}`)
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
      throw new Error(`Doğrulama hatası: ${errorMessage}`)
    }
  }

  /**
   * Checks if a magazine with the given issue number already exists
   */
  private async checkIssueNumberExists(
    issueNumber: number,
    excludeId?: string
  ): Promise<boolean> {
    let query = this.supabase
      .from('magazines')
      .select('id')
      .eq('issue_number', issueNumber)
    
    if (excludeId) {
      query = query.neq('id', excludeId)
    }
    
    const { data, error } = await query.single()
    
    // PGRST116 means no record found, which is what we want
    if (error && error.code === 'PGRST116') {
      return false
    }
    
    if (error) {
      throw new Error(`Veritabanı hatası: ${error.message}`)
    }
    
    return data !== null
  }

  /**
   * Gets the current version of a magazine for optimistic locking
   */
  private async getMagazineWithVersion(id: string): Promise<Magazine> {
    const { data, error } = await this.supabase
      .from('magazines')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !data) {
      throw new Error('Dergi bulunamadı')
    }
    
    return data as Magazine
  }

  /**
   * Creates a new magazine record
   * 
   * Implements Property 8: Uniqueness enforcement
   * Implements Property 33: Duplicate creation prevention
   * 
   * Requirements 9.1, 9.2, 9.5: Performance monitoring
   */
  async createMagazine(input: unknown): Promise<Magazine> {
    return performanceMonitor.measure('createMagazine', async () => {
      logger.info('Creating magazine', { input })
      
      // Validate input
      const validated = this.validateInput<MagazineInput>(
        MagazineInputSchema,
        input
      )
      
      // Check uniqueness before insertion
      const exists = await this.checkIssueNumberExists(validated.issue_number)
      
      if (exists) {
        logger.warn('Magazine creation failed: duplicate issue number', {
          issue_number: validated.issue_number
        })
        throw new Error(`Sayı ${validated.issue_number} zaten mevcut`)
      }
      
      // Insert magazine record
      const { data, error } = await this.supabase
        .from('magazines')
        .insert({
          ...validated,
          is_published: true,
          version: 1
        })
        .select()
        .single()
      
      if (error) {
        logger.error('Magazine creation failed: database error', {
          error: error.message,
          issue_number: validated.issue_number
        })
        throw new Error(`Veritabanı hatası: ${error.message}`)
      }
      
      logger.info('Magazine created successfully', {
        id: data.id,
        issue_number: data.issue_number
      })
      
      return data as Magazine
    })
  }

  /**
   * Uploads magazine files and creates database record with transaction support
   * 
   * Implements Property 11: Upload rollback on DB failure
   * Implements Property 14: Transaction step tracking
   * 
   * Requirements 9.1, 9.2, 9.5: Performance monitoring
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
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
      })
      
      const transaction = new TransactionManager()
      const uploadedFiles: string[] = []
      let createdMagazine: Magazine | null = null
      
      // Step 1: Upload files to storage
      transaction.addStep({
        name: 'upload-files',
        execute: async () => {
          for (const { path, file } of files) {
            await this.storage.uploadFile(STORAGE_CONFIG.BUCKET, path, file)
            uploadedFiles.push(path)
          }
          logger.info('Files uploaded successfully', {
            fileCount: uploadedFiles.length
          })
        },
        rollback: async () => {
          if (uploadedFiles.length > 0) {
            logger.warn('Rolling back file uploads', {
              fileCount: uploadedFiles.length
            })
            await this.storage.deleteFiles(STORAGE_CONFIG.BUCKET, uploadedFiles)
          }
        }
      })
      
      // Step 2: Create database record
      transaction.addStep({
        name: 'create-record',
        execute: async () => {
          createdMagazine = await this.createMagazine(magazineData)
        },
        rollback: async () => {
          // DB record creation failed, no rollback needed
        }
      })
      
      // Execute transaction
      await transaction.execute()
      
      if (!createdMagazine) {
        logger.error('Magazine upload failed: no magazine created')
        throw new Error('Dergi oluşturulamadı')
      }
      
      const magazine: Magazine = createdMagazine
      
      logger.info('Magazine upload completed successfully', {
        id: magazine.id,
        issue_number: magazine.issue_number,
        fileCount: files.length
      })
      
      return magazine
    })
  }

  /**
   * Renames a magazine with optimistic locking and transaction support
   * 
   * Implements Property 13: File move rollback
   * Implements Property 16: Optimistic locking conflict detection
   * Implements Property 17: Version conflict error messaging
   * Implements Property 34: Rename conflict early detection
   * 
   * Requirements 9.1, 9.2, 9.5: Performance monitoring
   */
  async renameMagazine(input: unknown): Promise<Magazine> {
    return performanceMonitor.measure('renameMagazine', async () => {
      logger.info('Starting magazine rename', { input })
      
      // Validate input
      const validated = this.validateInput<MagazineRenameInput>(
        MagazineRenameSchema,
        input
      )
      
      // Get current magazine with version check
      const current = await this.getMagazineWithVersion(validated.id)
      
      // Check version for optimistic locking
      if (current.version !== validated.version) {
        logger.warn('Magazine rename failed: version conflict', {
          id: validated.id,
          expectedVersion: validated.version,
          currentVersion: current.version
        })
        throw new Error(
          'Dergi başka bir kullanıcı tarafından değiştirildi. Lütfen sayfayı yenileyin.'
        )
      }
      
      // Check new issue_number uniqueness (if changing)
      if (validated.new_issue !== validated.old_issue) {
        const exists = await this.checkIssueNumberExists(
          validated.new_issue,
          validated.id
        )
        
        if (exists) {
          logger.warn('Magazine rename failed: duplicate issue number', {
            new_issue: validated.new_issue
          })
          throw new Error(`Sayı ${validated.new_issue} zaten mevcut`)
        }
      }
      
      const transaction = new TransactionManager()
      const movedFiles: Array<{ from: string; to: string }> = []
      let updatedMagazine: Magazine | null = null
      
      // Step 1: Move files in storage (if issue number changed)
      if (validated.new_issue !== validated.old_issue) {
        transaction.addStep({
          name: 'move-files',
          execute: async () => {
            const files = await this.storage.listFilesRecursive(
              STORAGE_CONFIG.BUCKET,
              `${validated.old_issue}/pages`
            )
            
            logger.info('Moving files for rename', {
              fileCount: files.length,
              from: validated.old_issue,
              to: validated.new_issue
            })
            
            const moves = files.map(file => ({
              from: file,
              to: file.replace(
                `${validated.old_issue}/`,
                `${validated.new_issue}/`
              )
            }))
            
            await this.storage.moveFiles(STORAGE_CONFIG.BUCKET, moves)
            movedFiles.push(...moves)
            
            logger.info('Files moved successfully', {
              fileCount: movedFiles.length
            })
          },
          rollback: async () => {
            if (movedFiles.length > 0) {
              logger.warn('Rolling back file moves', {
                fileCount: movedFiles.length
              })
              const reverseMoves = movedFiles.map(({ from, to }) => ({
                from: to,
                to: from
              }))
              await this.storage.moveFiles(STORAGE_CONFIG.BUCKET, reverseMoves)
            }
          }
        })
      }
      
      // Step 2: Update database record
      transaction.addStep({
        name: 'update-db',
        execute: async () => {
          const update: {
            issue_number: number
            version: number
            title?: string
          } = {
            issue_number: validated.new_issue,
            version: validated.version + 1
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
              id: validated.id
            })
            throw new Error(`Veritabanı güncelleme hatası: ${error.message}`)
          }
          
          if (!data) {
            logger.warn('Magazine rename failed: version conflict during update', {
              id: validated.id
            })
            throw new Error(
              'Dergi başka bir kullanıcı tarafından değiştirildi. Lütfen sayfayı yenileyin.'
            )
          }
          
          updatedMagazine = data as Magazine
        },
        rollback: async () => {
          // DB update failed, no rollback needed
        }
      })
      
      // Execute transaction
      await transaction.execute()
      
      if (!updatedMagazine) {
        logger.error('Magazine rename failed: no magazine updated')
        throw new Error('Dergi güncellenemedi')
      }
      
      const magazine: Magazine = updatedMagazine
      
      logger.info('Magazine rename completed successfully', {
        id: magazine.id,
        old_issue: validated.old_issue,
        new_issue: validated.new_issue,
        newVersion: magazine.version
      })
      
      return magazine
    })
  }

  /**
   * Deletes a magazine with storage-first approach
   * 
   * Implements Property 12: DB preservation on storage failure
   * 
   * Requirements 9.1, 9.2, 9.5: Performance monitoring
   */
  async deleteMagazine(input: unknown): Promise<void> {
    return performanceMonitor.measure('deleteMagazine', async () => {
      logger.info('Starting magazine deletion', { input })
      
      // Validate input
      const validated = this.validateInput<MagazineDeleteInput>(
        MagazineDeleteSchema,
        input
      )
      
      // Step 1: Delete storage files first
      const files = await this.storage.listFilesRecursive(
        STORAGE_CONFIG.BUCKET,
        String(validated.issue_number)
      )
      
      logger.info('Deleting storage files', {
        fileCount: files.length,
        issue_number: validated.issue_number
      })
      
      if (files.length > 0) {
        try {
          await this.storage.deleteFiles(STORAGE_CONFIG.BUCKET, files)
          logger.info('Storage files deleted successfully', {
            fileCount: files.length
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          logger.error('Magazine deletion failed: storage deletion error', {
            error: errorMessage,
            issue_number: validated.issue_number,
            fileCount: files.length
          })
          throw new Error(
            `Dosyalar silinemedi: ${errorMessage}. Veritabanı kaydı korundu.`
          )
        }
      }
      
      // Step 2: Delete database record
      const { error } = await this.supabase
        .from('magazines')
        .delete()
        .eq('id', validated.id)
      
      if (error) {
        logger.error('Magazine deletion failed: database deletion error', {
          error: error.message,
          id: validated.id,
          issue_number: validated.issue_number
        })
        throw new Error(
          `Veritabanı silme hatası: ${error.message}. Dosyalar silindi ama kayıt silinemedi.`
        )
      }
      
      logger.info('Magazine deletion completed successfully', {
        id: validated.id,
        issue_number: validated.issue_number
      })
    })
  }
}
