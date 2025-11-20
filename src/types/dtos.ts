export interface CreateMagazineDto {
  title: string
  issue_number: number
  publication_date: string
  cover_image_url?: string
  pdf_url?: string
  page_count?: number
  is_published: boolean
}

export interface UpdateMagazineDto {
  title?: string
  issue_number?: number
  publication_date?: string
  cover_image_url?: string
  pdf_url?: string
  page_count?: number
  is_published?: boolean
}

export interface DeleteMagazineDto {
  id: string
  issue_number: number
}

export interface RenameMagazineDto {
  id: string
  old_issue: number
  new_issue: number
  new_title?: string
}
