/**
 * File sorting utilities for handling filename-based sorting
 * Requirements: 9.1, 9.2, 9.3
 */

export interface FileWithName {
  name: string
}

/**
 * Extract the first number from a filename using regex
 * Returns 0 as default if no number is found
 * 
 * Requirements: 9.1, 9.2
 * 
 * @param filename - The filename to extract number from
 * @returns The first number found in the filename, or 0 if none found
 */
export function extractNumberFromFilename(filename: string): number {
  const match = filename.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

/**
 * Sort an array of files by the numeric value extracted from their filenames
 * Creates a new sorted array without mutating the original
 * 
 * Requirements: 9.3
 * 
 * @param files - Array of objects with a name property
 * @returns A new sorted array
 */
export function sortFilesByNumber<T extends FileWithName>(files: T[]): T[] {
  return [...files].sort((a, b) => {
    const na = extractNumberFromFilename(a.name)
    const nb = extractNumberFromFilename(b.name)
    return na - nb
  })
}
