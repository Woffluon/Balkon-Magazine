import { z } from 'zod'

// Zod schema for complete Magazine entity validation (database records)
export const MagazineEntitySchema = z.object({
  id: z.string(),
  title: z.string(),
  issue_number: z.number(),
  publication_date: z.string(),
  cover_image_url: z.string().nullable().optional(),
  pdf_url: z.string().nullable().optional(),
  page_count: z.number().nullable().optional(),
  is_published: z.boolean(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

// Export Magazine type from schema
export type Magazine = z.infer<typeof MagazineEntitySchema>

// Keep the interface for backward compatibility
export interface MagazineInterface {
  id: string
  title: string
  issue_number: number
  publication_date: string
  cover_image_url?: string | null
  pdf_url?: string | null
  page_count?: number | null
  is_published: boolean
  created_at?: string | null
  updated_at?: string | null
}
