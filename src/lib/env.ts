import { z } from 'zod'

/**
 * Environment Variable Validation
 * 
 * Validates all environment variables at application startup using Zod schemas.
 * Ensures type safety and catches configuration errors early.
 * 
 * Throws an error if any required environment variable is missing or invalid.
 */

// Define the environment variable schema
const envSchema = z.object({
  // Supabase configuration (required)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY cannot be empty'),
  
  // Node environment (required)
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  
  // Site URL (optional)
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url('NEXT_PUBLIC_SITE_URL must be a valid URL')
    .optional(),
  
  // Google verification (optional)
  NEXT_PUBLIC_GOOGLE_VERIFICATION: z
    .string()
    .optional(),
  
  // PDF.js worker URL (optional, has default)
  NEXT_PUBLIC_PDFJS_WORKER_URL: z
    .string()
    .default('/pdf.worker.min.mjs'),
})

// Type for validated environment variables
export type ValidatedEnv = z.infer<typeof envSchema>

/**
 * Validates and exports environment variables
 * 
 * @throws {Error} If validation fails with detailed error messages
 */
function validateEnv(): ValidatedEnv {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GOOGLE_VERIFICATION: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    NEXT_PUBLIC_PDFJS_WORKER_URL: process.env.NEXT_PUBLIC_PDFJS_WORKER_URL,
  }

  const result = envSchema.safeParse(env)

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    
    throw new Error(
      `Environment variable validation failed:\n${errors}\n\n` +
      `Please check your .env.local file and ensure all required variables are set correctly.`
    )
  }

  return result.data
}

// Validate and export the environment variables
export const env = validateEnv()

/**
 * Type-safe access to environment variables
 * 
 * Example usage:
 * ```typescript
 * import { env } from '@/lib/env'
 * 
 * const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
 * const nodeEnv = env.NODE_ENV
 * ```
 */
export default env
