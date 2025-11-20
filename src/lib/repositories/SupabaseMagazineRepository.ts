import type { SupabaseClient } from '@supabase/supabase-js'
import type { Magazine } from '@/types/magazine'
import type { CreateMagazineDto, UpdateMagazineDto } from '@/types/dtos'
import type { IMagazineRepository } from './IMagazineRepository'
import { DatabaseError } from '@/lib/errors/AppError'
import { assertMagazine, assertMagazineArray } from '@/lib/guards'

/**
 * Supabase implementation of the Magazine Repository
 * 
 * Handles all database operations for magazines using Supabase client.
 * Converts all Supabase errors to DatabaseError for consistent error handling.
 * 
 * @example
 * ```typescript
 * const client = createClient()
 * const repository = new SupabaseMagazineRepository(client)
 * const magazines = await repository.findAll()
 * ```
 */
export class SupabaseMagazineRepository implements IMagazineRepository {
  constructor(private client: SupabaseClient) {}

  /**
   * Retrieves all magazines ordered by issue number (descending)
   */
  async findAll(): Promise<Magazine[]> {
    const { data, error } = await this.client
      .from('magazines')
      .select('*')
      .order('issue_number', { ascending: false })

    if (error) {
      throw new DatabaseError(
        `Failed to fetch magazines: ${error.message}`,
        { code: error.code, details: error.details }
      )
    }

    // Validate data with runtime type guard
    return assertMagazineArray(data ?? [])
  }

  /**
   * Finds a magazine by its issue number
   * Returns null if not found instead of throwing an error
   */
  async findByIssue(issueNumber: number): Promise<Magazine | null> {
    const { data, error } = await this.client
      .from('magazines')
      .select('*')
      .eq('issue_number', issueNumber)
      .single()

    if (error) {
      // PGRST116 is the "not found" error code from PostgREST
      if (error.code === 'PGRST116') {
        return null
      }
      throw new DatabaseError(
        `Failed to fetch magazine by issue ${issueNumber}: ${error.message}`,
        { code: error.code, details: error.details }
      )
    }

    // Validate data with runtime type guard
    return data ? assertMagazine(data) : null
  }

  /**
   * Finds a magazine by its unique ID
   * Returns null if not found instead of throwing an error
   */
  async findById(id: string): Promise<Magazine | null> {
    const { data, error } = await this.client
      .from('magazines')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      // PGRST116 is the "not found" error code from PostgREST
      if (error.code === 'PGRST116') {
        return null
      }
      throw new DatabaseError(
        `Failed to fetch magazine by id ${id}: ${error.message}`,
        { code: error.code, details: error.details }
      )
    }

    // Validate data with runtime type guard
    return data ? assertMagazine(data) : null
  }

  /**
   * Creates a new magazine record with upsert logic
   * If a magazine with the same issue_number exists, it will be updated
   */
  async create(dto: CreateMagazineDto): Promise<Magazine> {
    const { data, error } = await this.client
      .from('magazines')
      .upsert(dto, { onConflict: 'issue_number' })
      .select()
      .single()

    if (error) {
      throw new DatabaseError(
        `Failed to create magazine: ${error.message}`,
        { code: error.code, details: error.details }
      )
    }

    // Validate data with runtime type guard
    return assertMagazine(data)
  }

  /**
   * Updates an existing magazine record
   */
  async update(id: string, dto: UpdateMagazineDto): Promise<Magazine> {
    const { data, error } = await this.client
      .from('magazines')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new DatabaseError(
        `Failed to update magazine ${id}: ${error.message}`,
        { code: error.code, details: error.details }
      )
    }

    // Validate data with runtime type guard
    return assertMagazine(data)
  }

  /**
   * Deletes a magazine record
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('magazines')
      .delete()
      .eq('id', id)

    if (error) {
      throw new DatabaseError(
        `Failed to delete magazine ${id}: ${error.message}`,
        { code: error.code, details: error.details }
      )
    }
  }
}
