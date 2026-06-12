import { z } from 'zod'
import { UUIDSchema } from './schemas'

/**
 * Zod validation schema for individual page engagement events.
 * Exposes strict controls over input type ranges.
 */
export const PageEngagementEventSchema = z.object({
  magazineId: UUIDSchema,
  pageNumber: z
    .number()
    .int('Sayfa numarası tam sayı olmalıdır.')
    .positive('Sayfa numarası 1 veya daha büyük olmalıdır.'),
  durationSeconds: z
    .number()
    .int('Okuma süresi tam sayı olmalıdır.')
    .nonnegative('Okuma süresi sıfır veya daha büyük olmalıdır.'),
})

/**
 * Zod validation schema for validating a batch array of page engagement events.
 */
export const PageEngagementBatchSchema = z.array(PageEngagementEventSchema)

export type PageEngagementEvent = z.infer<typeof PageEngagementEventSchema>
