/**
 * Standardized Supabase Client Creation Utilities
 * 
 * Provides consistent Supabase client creation patterns with proper error handling,
 * type safety, and standardized configuration across the application.
 * 
 * Requirements 7.4, 7.5:
 * - Standardized Supabase client creation patterns
 * - Consistent client creation across all contexts
 */

// Types for Supabase errors
interface SupabaseError {
  message: string
  code?: string
  details?: string
  hint?: string
}

interface StorageError {
  message: string
  statusCode?: number
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { 
  createClient as createServerClient,
  createPublicClient,
  getAuthenticatedClient
} from '@/lib/supabase/server'
import { logger } from '@/lib/services/Logger'
import { AppError } from '@/lib/errors/AppError'
import { isError } from './asyncPatterns'

/**
 * Supabase client context types for different usage scenarios
 */
export type SupabaseClientContext = 
  | 'browser'           // Client-side usage
  | 'server'            // Server-side without auth
  | 'server-auth'       // Server-side with auth required
  | 'public'            // Public data access without cookies
  | 'admin'             // Admin operations (server-side with auth)

/**
 * Supabase client configuration options
 */
export interface SupabaseClientOptions {
  context: SupabaseClientContext
  requireAuth?: boolean
  component?: string
  operation?: string
}

/**
 * Standardized Supabase client creation with consistent error handling
 * 
 * Creates Supabase clients with proper error handling, logging, and
 * context-appropriate configuration. Replaces direct client creation
 * with standardized patterns.
 * 
 * @param options - Client creation options
 * @returns Promise resolving to configured Supabase client
 * @throws AppError if client creation fails
 * 
 * @example
 * ```typescript
 * // Browser client for client-side operations
 * const client = await createStandardizedSupabaseClient({
 *   context: 'browser',
 *   component: 'MagazineList',
 *   operation: 'fetchMagazines'
 * })
 * 
 * // Server client with authentication
 * const authClient = await createStandardizedSupabaseClient({
 *   context: 'server-auth',
 *   component: 'AdminActions',
 *   operation: 'deleteMagazine'
 * })
 * 
 * // Public client for cached data
 * const publicClient = await createStandardizedSupabaseClient({
 *   context: 'public',
 *   component: 'HomePage',
 *   operation: 'fetchPublicMagazines'
 * })
 * ```
 */
export async function createStandardizedSupabaseClient(
  options: SupabaseClientOptions
): Promise<SupabaseClient> {
  const { context, component, operation } = options
  
  const logContext = {
    context,
    component,
    operation,
    timestamp: new Date().toISOString()
  }
  
  logger.debug('Creating Supabase client', logContext)
  
  try {
    let client: SupabaseClient
    
    switch (context) {
      case 'browser':
        client = createBrowserClient()
        break
        
      case 'server':
        client = await createServerClient()
        break
        
      case 'server-auth':
      case 'admin':
        client = await getAuthenticatedClient()
        break
        
      case 'public':
        client = createPublicClient()
        break
        
      default:
        throw new AppError(
          `Unknown Supabase client context: ${context}`,
          'INVALID_CLIENT_CONTEXT',
          400,
          'Geçersiz istemci bağlamı.',
          false,
          { context }
        )
    }
    
    logger.debug('Supabase client created successfully', {
      ...logContext,
      clientType: context
    })
    
    return client
  } catch (error) {
    logger.error('Failed to create Supabase client', {
      ...logContext,
      error: isError(error) ? error.message : String(error),
      stack: isError(error) ? error.stack : undefined
    })
    
    // Re-throw AppErrors as-is, wrap other errors
    if (error instanceof AppError) {
      throw error
    }
    
    throw new AppError(
      `Failed to create Supabase client: ${isError(error) ? error.message : String(error)}`,
      'CLIENT_CREATION_ERROR',
      500,
      'Veritabanı bağlantısı kurulamadı. Lütfen tekrar deneyin.',
      true,
      { originalError: error, ...logContext }
    )
  }
}

/**
 * Standardized Supabase query execution with consistent error handling
 * 
 * Executes Supabase queries with standardized error handling, logging,
 * and result validation. Provides consistent patterns for all database
 * operations.
 * 
 * @param client - Supabase client instance
 * @param queryBuilder - Function that builds and executes the query
 * @param options - Query execution options
 * @returns Promise resolving to query result
 * @throws AppError if query execution fails
 * 
 * @example
 * ```typescript
 * const magazines = await executeSupabaseQuery(
 *   client,
 *   (supabase) => supabase
 *     .from('magazines')
 *     .select('*')
 *     .eq('is_published', true)
 *     .order('issue_number', { ascending: false }),
 *   {
 *     operation: 'fetchPublishedMagazines',
 *     component: 'MagazineList',
 *     expectData: true
 *   }
 * )
 * ```
 */
export async function executeSupabaseQuery<T>(
  client: SupabaseClient,
  queryBuilder: (supabase: SupabaseClient) => Promise<{ data: T | null; error: SupabaseError | null }>,
  options: {
    operation: string
    component?: string
    expectData?: boolean
    allowEmpty?: boolean
  }
): Promise<T> {
  const { operation, component, expectData = true, allowEmpty = false } = options
  
  const logContext = {
    operation,
    component,
    expectData,
    allowEmpty,
    timestamp: new Date().toISOString()
  }
  
  logger.debug('Executing Supabase query', logContext)
  
  try {
    const startTime = Date.now()
    const result = await queryBuilder(client)
    const duration = Date.now() - startTime
    
    // Check for Supabase errors
    if (result.error) {
      logger.error('Supabase query error', {
        ...logContext,
        error: result.error.message,
        code: result.error.code,
        details: result.error.details,
        hint: result.error.hint,
        duration
      })
      
      throw new AppError(
        `Database query failed: ${result.error.message}`,
        'DATABASE_QUERY_ERROR',
        500,
        'Veritabanı sorgusu başarısız oldu. Lütfen tekrar deneyin.',
        true,
        { 
          originalError: result.error,
          supabaseCode: result.error.code,
          ...logContext
        }
      )
    }
    
    // Validate data presence if expected
    if (expectData && result.data === null && !allowEmpty) {
      logger.warn('Supabase query returned no data when data was expected', {
        ...logContext,
        duration
      })
      
      throw new AppError(
        'Query returned no data when data was expected',
        'NO_DATA_FOUND',
        404,
        'Veri bulunamadı.',
        false,
        { ...logContext }
      )
    }
    
    logger.debug('Supabase query completed successfully', {
      ...logContext,
      hasData: result.data !== null,
      dataType: typeof result.data,
      duration
    })
    
    return result.data as T
  } catch (error) {
    // Re-throw AppErrors as-is
    if (error instanceof AppError) {
      throw error
    }
    
    logger.error('Supabase query execution failed', {
      ...logContext,
      error: isError(error) ? error.message : String(error),
      stack: isError(error) ? error.stack : undefined
    })
    
    throw new AppError(
      `Query execution failed: ${isError(error) ? error.message : String(error)}`,
      'QUERY_EXECUTION_ERROR',
      500,
      'Sorgu çalıştırılamadı. Lütfen tekrar deneyin.',
      true,
      { originalError: error, ...logContext }
    )
  }
}

/**
 * Standardized Supabase storage operation with consistent error handling
 * 
 * Executes Supabase storage operations with standardized error handling,
 * logging, and result validation.
 * 
 * @param client - Supabase client instance
 * @param storageOperation - Function that executes the storage operation
 * @param options - Storage operation options
 * @returns Promise resolving to operation result
 * @throws AppError if storage operation fails
 * 
 * @example
 * ```typescript
 * const uploadResult = await executeSupabaseStorageOperation(
 *   client,
 *   (supabase) => supabase.storage
 *     .from('magazines')
 *     .upload(path, file, { upsert: true }),
 *   {
 *     operation: 'uploadFile',
 *     component: 'UploadDialog',
 *     path,
 *     fileSize: file.size
 *   }
 * )
 * ```
 */
export async function executeSupabaseStorageOperation<T>(
  client: SupabaseClient,
  storageOperation: (supabase: SupabaseClient) => Promise<{ data: T | null; error: StorageError | null }>,
  options: {
    operation: string
    component?: string
    path?: string
    fileSize?: number
  }
): Promise<T> {
  const { operation, component, path, fileSize } = options
  
  const logContext = {
    operation,
    component,
    path,
    fileSize,
    fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : undefined,
    timestamp: new Date().toISOString()
  }
  
  logger.debug('Executing Supabase storage operation', logContext)
  
  try {
    const startTime = Date.now()
    const result = await storageOperation(client)
    const duration = Date.now() - startTime
    
    // Check for Supabase storage errors
    if (result.error) {
      logger.error('Supabase storage operation error', {
        ...logContext,
        error: result.error.message,
        statusCode: result.error.statusCode,
        duration
      })
      
      throw new AppError(
        `Storage operation failed: ${result.error.message}`,
        'STORAGE_OPERATION_ERROR',
        result.error.statusCode || 500,
        'Dosya işlemi başarısız oldu. Lütfen tekrar deneyin.',
        true,
        { 
          originalError: result.error,
          storageStatusCode: result.error.statusCode,
          ...logContext
        }
      )
    }
    
    logger.debug('Supabase storage operation completed successfully', {
      ...logContext,
      hasData: result.data !== null,
      duration
    })
    
    return result.data as T
  } catch (error) {
    // Re-throw AppErrors as-is
    if (error instanceof AppError) {
      throw error
    }
    
    logger.error('Supabase storage operation execution failed', {
      ...logContext,
      error: isError(error) ? error.message : String(error),
      stack: isError(error) ? error.stack : undefined
    })
    
    throw new AppError(
      `Storage operation execution failed: ${isError(error) ? error.message : String(error)}`,
      'STORAGE_EXECUTION_ERROR',
      500,
      'Dosya işlemi çalıştırılamadı. Lütfen tekrar deneyin.',
      true,
      { originalError: error, ...logContext }
    )
  }
}

/**
 * Utility to validate Supabase client instance
 * 
 * Validates that a value is a proper Supabase client instance
 * with required methods and properties.
 * 
 * @param client - Value to validate as Supabase client
 * @returns True if valid Supabase client, false otherwise
 */
export function isValidSupabaseClient(client: unknown): client is SupabaseClient {
  return (
    client !== null &&
    typeof client === 'object' &&
    'from' in client &&
    'storage' in client &&
    'auth' in client &&
    typeof (client as { from?: unknown }).from === 'function' &&
    typeof (client as { storage?: unknown }).storage === 'object' &&
    typeof (client as { auth?: unknown }).auth === 'object'
  )
}

/**
 * Utility to safely get Supabase client with validation
 * 
 * Gets a Supabase client and validates it before returning.
 * Provides type-safe client access with runtime validation.
 * 
 * @param options - Client creation options
 * @returns Promise resolving to validated Supabase client
 * @throws AppError if client is invalid
 * 
 * @example
 * ```typescript
 * const client = await getValidatedSupabaseClient({
 *   context: 'server-auth',
 *   component: 'AdminPanel',
 *   operation: 'deleteUser'
 * })
 * 
 * // Client is guaranteed to be valid and properly typed
 * const result = await client.from('users').delete().eq('id', userId)
 * ```
 */
export async function getValidatedSupabaseClient(
  options: SupabaseClientOptions
): Promise<SupabaseClient> {
  const client = await createStandardizedSupabaseClient(options)
  
  if (!isValidSupabaseClient(client)) {
    throw new AppError(
      'Invalid Supabase client instance',
      'INVALID_CLIENT_INSTANCE',
      500,
      'Geçersiz veritabanı istemcisi.',
      false,
      { options }
    )
  }
  
  return client
}