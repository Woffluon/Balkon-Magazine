export interface StorageFile {
  name: string
  id: string | null
  path: string
}

export interface UploadOptions {
  upsert?: boolean
  contentType?: string
  cacheControl?: string
}

export interface ListOptions {
  limit?: number
  offset?: number
}
