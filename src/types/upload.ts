export interface MagazineUploadData {
  pdf: File
  cover: File | null
  title: string
  issueNumber: number
  publicationDate: string
  onPageProgress?: (done: number, total: number) => void
  onCoverProgress?: (percent: number) => void
  onPdfProcessing?: (current: number, total: number) => void
}

export interface ProcessedPage {
  pageNumber: number
  blob: Blob
  path?: string
}
