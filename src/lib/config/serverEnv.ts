import 'server-only'

import { z } from 'zod'

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY cannot be empty'),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cached: ServerEnv | null = null

function validateServerEnv(): ServerEnv {
  const envVars = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  const result = serverEnvSchema.safeParse(envVars)

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(
      `Server environment variable validation failed:\n${errors}\n\n` +
        `Please set the missing variables in your deployment environment.`
    )
  }

  return result.data
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached
  cached = validateServerEnv()
  return cached
}
