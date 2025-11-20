'use server'

import { getServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { parseFormDataWithZod } from '@/lib/validators/formDataParser'
import { loginSchema } from '@/lib/validators/magazineSchemas'
import { ValidationError } from '@/lib/errors/AppError'

export type LoginState = {
  error?: string
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    const supabase = await getServerClient()

    // Validate form data using Zod schema
    const data = parseFormDataWithZod(formData, loginSchema)

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return { error: 'E-posta veya şifre hatalı.' }
    }

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

