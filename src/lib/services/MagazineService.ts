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
   * @param id - The magazine ID to delete
   * @param issueNumber - The issue number for storage cleanup
   * @returns Promise resolving when deletion is complete
   * @throws {DatabaseError} If database deletion fails
   * @throws {StorageError} If storage deletion fails
   */
  async deleteMagazine(id: string, issueNumber: number): Promise<void> {
    // Delete storage files first
    await this.deleteIssueFiles(issueNumber)
    
    // Then delete database record
    await this.magazineRepository.delete(id)
  }

  /**
   * Renames a magazine by moving its storage files and updating the database
   * 
   * @param id - The magazine ID to update
   * @param oldIssue - The current issue number
   * @param newIssue - The new issue number
   * @param newTitle - Optional new title for the magazine
   * @returns Promise resolving to updated magazine
   * @throws {DatabaseError} If database update fails
   * @throws {StorageError} If storage operations fail
   */
  async renameMagazine(
    id: string,
    oldIssue: number,
    newIssue: number,
    newTitle?: string
  ): Promise<Magazine> {
    // Move storage files
    await this.moveIssueFiles(oldIssue, newIssue)
    
    // Update database record
    const updateData: UpdateMagazineDto = { issue_number: newIssue }
    if (newTitle) {
      updateData.title = newTitle
    }
    
    return await this.magazineRepository.update(id, updateData)
  }

  /**
   * Deletes all storage files for a magazine issue
   * 
   * @param issueNumber - The issue number
   * @returns Promise resolving when deletion is complete
   * @throws {StorageError} If deletion fails
   */
  private async deleteIssueFiles(issueNumber: number): Promise<void> {
    const files = await this.listAllIssueFiles(issueNumber)
    
    if (files.length > 0) {
      await this.storageService.delete(files.map(f => f.path))
    }
  }

  /**
   * Moves all storage files from one issue number to another
   * 
   * @param oldIssue - The current issue number
   * @param newIssue - The new issue number
   * @returns Promise resolving when move is complete
   * @throws {StorageError} If move operations fail
   */
  private async moveIssueFiles(oldIssue: number, newIssue: number): Promise<void> {
    // If moving to the same issue number, skip
    if (oldIssue === newIssue) {
      return
    }
    
    // Delete target directory first to avoid conflicts
    try {
      await this.deleteIssueFiles(newIssue)
    } catch {
      // Ignore errors if target doesn't exist
    }
    
    const pagesPath = STORAGE_PATHS.getPagesPath(oldIssue)
    const pages = await this.storageService.list(pagesPath)
    
    // Move cover image
    const oldCoverPath = STORAGE_PATHS.getCoverPath(oldIssue)
    const newCoverPath = STORAGE_PATHS.getCoverPath(newIssue)
    
    try {
      await this.storageService.move(oldCoverPath, newCoverPath)
    } catch {
      // Fallback to copy + delete if move fails
      await this.storageService.copy(oldCoverPath, newCoverPath)
      await this.storageService.delete([oldCoverPath])
    }
    
    // Move all page files
    for (const page of pages) {
      const fromPath = `${oldIssue}/pages/${page.name}`
      const toPath = `${newIssue}/pages/${page.name}`
      
      try {
        await this.storageService.move(fromPath, toPath)
      } catch {
        // Fallback to copy + delete if move fails
        await this.storageService.copy(fromPath, toPath)
        await this.storageService.delete([fromPath])
      }
    }
  }

  /**
   * Lists all storage files for a magazine issue recursively
   * 
   * @param issueNumber - The issue number
   * @returns Promise resolving to array of storage files
   * @throws {StorageError} If listing fails
   */
  private async listAllIssueFiles(issueNumber: number): Promise<StorageFile[]> {
    const files: StorageFile[] = []
    const issuePrefix = String(issueNumber)
    
    const listRecursive = async (prefix: string): Promise<void> => {
      const items = await this.storageService.list(prefix)
      
      for (const item of items) {
        if (item.id) {
          // It's a file
          files.push(item)
        } else {
          // It's a directory, recurse into it
          await listRecursive(item.path)
        }
      }
    }
    
    await listRecursive(issuePrefix)
    return files
  }
}
