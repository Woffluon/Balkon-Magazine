import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/config/env'
import { getServerEnv } from '@/lib/config/serverEnv'

export function createAdminClient(): SupabaseClient {
  const serverEnv = getServerEnv()
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY)
}
