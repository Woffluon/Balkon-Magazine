'use server'

import { getServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { parseFormDataWithZod } from '@/lib/validators/formDataParser'
import { loginSchema } from '@/lib/validators/magazineSchemas'
import { ValidationError } from '@/lib/errors/AppError'
import { rateLimiter } from '@/lib/services/rateLimiting'
import { getErrorEntry } from '@/lib/constants/errorCatalog'

export type LoginState = {
  error?: string
}

/**
 * Extract client IP address from request headers
 * Checks multiple headers in order of preference
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers()
  
  // Check common headers for client IP (in order of preference)
  const ip = 
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
    headersList.get('x-real-ip') ||
    headersList.get('cf-connecting-ip') || // Cloudflare
    headersList.get('x-client-ip') ||
    'unknown'
  
  return ip
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    // Extract client IP for rate limiting
    const clientIP = await getClientIP()

    // Check rate limit before processing login
    if (!rateLimiter.checkLoginLimit(clientIP)) {
      const resetTime = rateLimiter.getLoginResetTime(clientIP)
      const minutesRemaining = resetTime ? Math.ceil(resetTime / 60000) : 15
      return { 
        error: `Çok fazla başarısız giriş denemesi. Lütfen ${minutesRemaining} dakika sonra tekrar deneyin.` 
      }
    }

    const supabase = await getServerClient()

    // Validate form data using Zod schema
    const data = parseFormDataWithZod(formData, loginSchema)

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      // Record failed login attempt
      rateLimiter.recordLoginAttempt(clientIP)
      
      // Use generic error message from catalog to avoid revealing security details
      // Don't expose whether email or password was wrong
      const errorEntry = getErrorEntry('AUTH_INVALID_CREDENTIALS')
      return { error: errorEntry.userMessage }
    }

    // Reset login attempts on successful login
    rateLimiter.resetLoginAttempts(clientIP)

    revalidatePath('/', 'layout')
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.userMessage }
    }
    
    // Use generic error message from catalog for unexpected errors
    const errorEntry = getErrorEntry('GENERAL_OPERATION_FAILED')
    return { error: errorEntry.userMessage }
  }
  
  // Redirect outside of try-catch because Next.js redirect throws an error by design
  redirect('/admin')
}

export async function logout(): Promise<void> {
  try {
    const supabase = await getServerClient()
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      // Log the error but continue with redirect
      const { logger } = await import('@/lib/services/Logger')
      logger.error('Logout sign-out failed', {
        operation: 'logout',
        error: error.message,
        errorCode: error.status,
      })
    }
  } catch (error) {
    // Log unexpected errors but ensure we still redirect
    const { logger } = await import('@/lib/services/Logger')
    logger.error('Logout operation failed', {
      operation: 'logout',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
  
  // Always redirect to login, even if sign-out failed
  // This ensures session cleanup on the client side
  redirect('/admin/login')
}

