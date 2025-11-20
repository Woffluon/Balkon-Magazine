import type { Magazine } from '@/types/magazine'
import type { CreateMagazineDto, UpdateMagazineDto } from '@/types/dtos'

/**
 * Magazine Repository Interface
 * 
 * Defines the contract for magazine data access operations.
 * Implementations should handle all database interactions and
 * convert database-specific errors to domain errors.
 * 
 * @example
 * ```typescript
 * const repository: IMagazineRepository = new SupabaseMagazineRepository(client)
 * const magazines = await repository.findAll()
 * ```
 */
export interface IMagazineRepository {
  /**
   * Retrieves all magazines ordered by issue number (descending)
   * 
   * @returns Promise resolving to array of magazines
   * @throws {DatabaseError} If database query fails
   */
  findAll(): Promise<Magazine[]>

  /**
   * Finds a magazine by its issue number
   * 
   * @param issueNumber - The issue number to search for
   * @returns Promise resolving to magazine or null if not found
   * @throws {DatabaseError} If database query fails
   */
  findByIssue(issueNumber: number): Promise<Magazine | null>

  /**
   * Finds a magazine by its unique ID
   * 
   * @param id - The magazine ID (UUID)
   * @returns Promise resolving to magazine or null if not found
   * @throws {DatabaseError} If database query fails
   */
  findById(id: string): Promise<Magazine | null>

  /**
   * Creates a new magazine record
   * 
   * @param data - Magazine data to create
   * @returns Promise resolving to created magazine
   * @throws {DatabaseError} If creation fails
   */
  create(data: CreateMagazineDto): Promise<Magazine>

  /**
   * Updates an existing magazine record
   * 
   * @param id - The magazine ID to update
   * @param data - Partial magazine data to update
   * @returns Promise resolving to updated magazine
   * @throws {DatabaseError} If update fails or magazine not found
   */
  update(id: string, data: UpdateMagazineDto): Promise<Magazine>

  /**
   * Deletes a magazine record
   * 
   * @param id - The magazine ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws {DatabaseError} If deletion fails
   */
  delete(id: string): Promise<void>
}
