'use server'

import { getAuthenticatedClient } from '@/lib/supabase/server'
import { passwordChangeSchema } from '@/lib/validators/magazineSchemas'
import { ValidationError, AuthenticationError } from '@/lib/errors/AppError'

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
      throw new AuthenticationError('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    })

    if (signInError) {
      return {
        success: false,
        error: 'Mevcut şifre hatalı'
      }
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      return {
        success: false,
        error: 'Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin.'
      }
    }

    return {
      success: true
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: 'Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin.'
    }
  }
}
