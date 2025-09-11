export interface Magazine {
  id: string | number
  title: string
  issue_number: number
  cover_image_url?: string | null
  is_published: boolean
  created_at?: string | null
  updated_at?: string | null
}
