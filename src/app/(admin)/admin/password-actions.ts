'use server'

import { getAuthenticatedClient } from '@/lib/supabase/server'
import { passwordChangeSchema } from '@/lib/validators/magazineSchemas'
import { ValidationError, AuthenticationError } from '@/lib/errors/AppError'
import { verifyCSRFOrigin } from '@/lib/services/authorization'
import { rateLimiter } from '@/lib/services/rateLimiting'

export type PasswordChangeState = {
  success?: boolean
  error?: string
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<PasswordChangeState> {
  try {
    // Validate input using Zod schema
    const validationResult = passwordChangeSchema.safeParse({
      currentPassword,
      newPassword
    })

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      return {
        success: false,
        error: firstError.message
      }
    }

    // getAuthenticatedClient will redirect to login if not authenticated
    const supabase = await getAuthenticatedClient()

    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user?.email) {
      // Use error catalog for consistent session error messaging
      const { getErrorEntry } = await import('@/lib/constants/errorCatalog')
      const errorEntry = getErrorEntry('AUTH_SESSION_EXPIRED')
      throw new AuthenticationError(
        'Session not found',
        'session_expired',
        errorEntry.userMessage
      )
    }

    await verifyCSRFOrigin()

    if (!rateLimiter.checkPasswordChangeLimit(user.id)) {
      const resetTime = rateLimiter.getPasswordChangeResetTime(user.id)
      const minutesRemaining = resetTime ? Math.ceil(resetTime / 60000) : 15
      return {
        success: false,
        error: `Çok fazla şifre değiştirme denemesi. Lütfen ${minutesRemaining} dakika sonra tekrar deneyin.`
      }
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    })

    if (signInError) {
      rateLimiter.recordPasswordChangeAttempt(user.id)
      // Use generic error message from catalog to avoid revealing security details
      // Don't expose whether the current password was wrong
      const { getErrorEntry } = await import('@/lib/constants/errorCatalog')
      const errorEntry = getErrorEntry('AUTH_INVALID_CREDENTIALS')
      return {
        success: false,
        error: errorEntry.userMessage
      }
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      rateLimiter.recordPasswordChangeAttempt(user.id)
      // Use error catalog for consistent error messaging
      const { getErrorEntry } = await import('@/lib/constants/errorCatalog')
      const errorEntry = getErrorEntry('GENERAL_OPERATION_FAILED')
      return {
        success: false,
        error: errorEntry.userMessage
      }
    }

    rateLimiter.resetPasswordChangeAttempts(user.id)

    return {
      success: true
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return {
        success: false,
        error: error.userMessage
      }
    }
    // Use error catalog for unexpected errors
    const { getErrorEntry } = await import('@/lib/constants/errorCatalog')
    const errorEntry = getErrorEntry('GENERAL_OPERATION_FAILED')
    return {
      success: false,
      error: errorEntry.userMessage
    }
  }
}
