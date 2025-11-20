export interface Magazine {
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
