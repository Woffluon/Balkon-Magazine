/**
 * Environment Configuration
 * 
 * Validates and provides type-safe access to environment variables.
 * Throws descriptive errors if required variables are missing.
 */

/**
 * Validates that a required environment variable exists
 * 
 * @param key - The environment variable key
 * @param value - The environment variable value
 * @returns The validated value
 * @throws {Error} If the value is undefined or empty
 */
function requireEnv(key: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please ensure ${key} is set in your .env.local file.`
    )
  }
  return value
}

/**
 * Validated Supabase configuration
 */
export const supabaseConfig = {
  url: requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  anonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
} as const

/**
 * Type guard to check if Supabase config is valid
 * 
 * @returns true if configuration is valid
 */
export function isSupabaseConfigValid(): boolean {
  try {
    return !!(supabaseConfig.url && supabaseConfig.anonKey)
  } catch {
    return false
  }
}
