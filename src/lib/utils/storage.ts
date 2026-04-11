import { env } from '@/lib/config/env'

/**
 * Storage URL utilities
 * Converts storage paths to public URLs
 */

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const STORAGE_PROVIDER = env.NEXT_PUBLIC_STORAGE_PROVIDER
const R2_PUBLIC_URL = env.NEXT_PUBLIC_R2_PUBLIC_URL
const STORAGE_BUCKET = 'magazines'

/**
 * Converts a storage path to a public URL
 * @param path - The storage path (e.g., "1/cover.webp")
 * @returns Full public URL to the storage file
 */
export function getStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path

  if (STORAGE_PROVIDER === 'r2') {
    if (!R2_PUBLIC_URL) return null
    // If public URL has trailing slash, handle it to prevent double slash
    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL
    return `${baseUrl}/${cleanPath}`
  }
  
  if (!SUPABASE_URL) return null
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${cleanPath}`
}

/**
 * Converts a Magazine object's cover_image_url to a full public URL
 * @param coverImageUrl - The cover image path from database
 * @returns Full public URL or null
 */
export function getMagazineCoverUrl(coverImageUrl: string | null | undefined): string | null {
  return getStorageUrl(coverImageUrl)
}
