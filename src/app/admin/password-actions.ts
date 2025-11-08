'use server'

import { createClient } from '@/lib/supabase/server'

export type PasswordChangeState = {
  success?: boolean
  error?: string
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<PasswordChangeState> {
  try {
    const supabase = await createClient()

    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user?.email) {
      return {
        success: false,
        error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.'
      }
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
    return {
      success: false,
      error: 'Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin.'
    }
  }
}
