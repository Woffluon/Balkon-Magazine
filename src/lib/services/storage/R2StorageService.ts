import { S3Client, PutObjectCommand, DeleteObjectsCommand, CopyObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import type { IStorageService } from './IStorageService'
import type { StorageFile, UploadOptions, ListOptions } from '@/types/storage'
import { STORAGE_CONFIG } from '@/lib/constants/storage'
import { assertStorageFileArray } from '@/lib/guards'
import { withRetry } from '@/lib/utils/retry'
import { env } from '@/lib/env'

/**
 * Cloudflare R2 Storage Service Implementation
 * 
 * Implements the IStorageService interface using AWS S3 SDK for Cloudflare R2.
 */
export class R2StorageService implements IStorageService {
  private client: S3Client
  private bucketName: string
  private publicUrl: string

  constructor(bucketName?: string) {
    this.bucketName = bucketName ?? env.R2_BUCKET_NAME ?? STORAGE_CONFIG.BUCKET
    this.publicUrl = env.NEXT_PUBLIC_R2_PUBLIC_URL ?? ''

    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      console.warn('R2 configuration is missing some environment variables. Storage calls will fail.');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
      },
      // Cloudflare R2 might not strictly require path style, but often recommended
      forcePathStyle: true, 
    })
  }

  async upload(path: string, file: File | Blob, options?: UploadOptions): Promise<void> {
    const { logger } = await import('@/lib/services/Logger')
    const endTimer = logger.startTimer('r2.upload')

    try {
      // Convert File/Blob to Buffer for S3 SDK
      const buffer = Buffer.from(await file.arrayBuffer())

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: path,
        Body: buffer,
        ContentType: options?.contentType ?? (file instanceof File ? file.type : 'application/octet-stream'),
        CacheControl: options?.cacheControl ?? STORAGE_CONFIG.CACHE_CONTROL,
      })

      await this.client.send(command)
    } catch (error) {
      const { ErrorHandler } = await import('@/lib/errors/errorHandler')
      throw ErrorHandler.handleStorageError(error instanceof Error ? error : new Error(String(error)), 'upload', path)
    } finally {
      endTimer()
    }
  }

  async delete(paths: string[]): Promise<void> {
    if (paths.length === 0) return

    const { logger } = await import('@/lib/services/Logger')
    const endTimer = logger.startTimer('r2.delete')

    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: paths.map(path => ({ Key: path })),
          Quiet: false,
        }
      })

      await this.client.send(command)
    } catch (error) {
      const { ErrorHandler } = await import('@/lib/errors/errorHandler')
      const contextPath = paths.length > 0 ? paths[0] : undefined
      throw ErrorHandler.handleStorageError(error instanceof Error ? error : new Error(String(error)), 'delete', contextPath)
    } finally {
      endTimer()
    }
  }

  async deleteWithPartialRetry(
    paths: string[],
    config?: Partial<import('@/lib/utils/retry').RetryConfig>
  ): Promise<import('@/lib/utils/retry').BatchOperationResult<string>> {
    const { withPartialRetry } = await import('@/lib/utils/retry')
    
    if (paths.length === 0) {
      return { successes: [], failures: [] }
    }

    return await withPartialRetry(
      paths,
      async (path) => {
        try {
          const command = new DeleteObjectsCommand({
            Bucket: this.bucketName,
            Delete: {
              Objects: [{ Key: path }],
            }
          })
          await this.client.send(command)
        } catch (error) {
          const { ErrorHandler } = await import('@/lib/errors/errorHandler')
          throw ErrorHandler.handleStorageError(error instanceof Error ? error : new Error(String(error)), 'delete', path)
        }
      },
      config
    )
  }

  async move(fromPath: string, toPath: string): Promise<void> {
    try {
      await this.copy(fromPath, toPath)
      await this.delete([fromPath])
    } catch (error) {
      const { ErrorHandler } = await import('@/lib/errors/errorHandler')
      throw ErrorHandler.handleStorageError(error instanceof Error ? error : new Error(String(error)), 'move', fromPath)
    }
  }

  async copy(fromPath: string, toPath: string): Promise<void> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${fromPath}`,
        Key: toPath,
      })

      await this.client.send(command)
    } catch (error) {
      const { ErrorHandler } = await import('@/lib/errors/errorHandler')
      throw ErrorHandler.handleStorageError(error instanceof Error ? error : new Error(String(error)), 'move', fromPath)
    }
  }

  async list(prefix: string, options?: ListOptions): Promise<StorageFile[]> {
    const { logger } = await import('@/lib/services/Logger')
    const endTimer = logger.startTimer('r2.list')

    try {
      return await withRetry(
        async () => {
          const command = new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: prefix,
            MaxKeys: options?.limit ?? 1000,
          })

          const data = await this.client.send(command)

          const files = (data.Contents ?? []).map(item => {
            const path = item.Key ?? ''
            const name = path.split('/').pop() ?? path
            return {
              name,
              id: item.ETag?.replace(/"/g, '') ?? null,
              path
            }
          })

          return assertStorageFileArray(files)
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          backoffMultiplier: 2
        }
      )
    } catch (error) {
        const { ErrorHandler } = await import('@/lib/errors/errorHandler')
        throw ErrorHandler.handleStorageError(error instanceof Error ? error : new Error(String(error)), 'list', prefix)
    } finally {
      endTimer()
    }
  }

  getPublicUrl(path: string): string {
    const formattedUrl = this.publicUrl.endsWith('/') ? this.publicUrl : `${this.publicUrl}/`
    const formattedPath = path.startsWith('/') ? path.substring(1) : path
    return `${formattedUrl}${formattedPath}`
  }
}
