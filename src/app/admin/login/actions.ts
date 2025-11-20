'use server'

import { getServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { parseFormDataWithZod } from '@/lib/validators/formDataParser'
import { loginSchema } from '@/lib/validators/magazineSchemas'
import { ValidationError } from '@/lib/errors/AppError'
import { rateLimiter } from '@/lib/services/rateLimiting'

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
      return { error: 'E-posta veya şifre hatalı.' }
    }

    // Reset login attempts on successful login
    rateLimiter.resetLoginAttempts(clientIP)

    revalidatePath('/', 'layout')
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message }
    }
    return { error: 'Giriş yapılırken bir hata oluştu.' }
  }
  
  // Redirect outside of try-catch because Next.js redirect throws an error by design
  redirect('/admin')
}

export async function logout(): Promise<void> {
  const supabase = await getServerClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

