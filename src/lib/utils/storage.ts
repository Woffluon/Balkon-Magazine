/**
 * Storage URL utilities
 * Converts storage paths to public URLs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const STORAGE_BUCKET = 'magazines'

/**
 * Converts a storage path to a public URL
 * @param path - The storage path (e.g., "1/cover.webp")
 * @returns Full public URL to the storage file
 */
export function getStorageUrl(path: string | null | undefined): string | null {
  if (!path || !SUPABASE_URL) return null
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  
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
