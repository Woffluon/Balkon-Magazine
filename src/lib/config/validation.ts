/**
 * Configuration Validation
 * 
 * Zod schemas for validating configuration values at runtime.
 * Ensures type safety and catches configuration errors early.
 */

import { z } from 'zod'

/**
 * Aspect ratio validation schema
 */
export const AspectRatioSchema = z.object({
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
}).readonly()

/**
 * Viewport configuration validation schema
 */
export const ViewportSchema = z.object({
  minWidth: z.number().positive('Minimum width must be positive'),
  maxWidth: z.number().positive('Maximum width must be positive'),
  defaultWidth: z.number().positive('Default width must be positive'),
  heightRatio: z.number().min(0.1).max(1.0, 'Height ratio must be between 0.1 and 1.0'),
  defaultHeight: z.number().positive('Default height must be positive'),
  loadingHeight: z.number().positive('Loading height must be positive'),
}).readonly().refine(
  (data) => data.minWidth <= data.maxWidth,
  { message: 'Minimum width must be less than or equal to maximum width' }
).refine(
  (data) => data.defaultWidth >= data.minWidth && data.defaultWidth <= data.maxWidth,
  { message: 'Default width must be within min/max range' }
)

/**
 * Preload configuration validation schema
 */
export const PreloadSchema = z.object({
  pagesAhead: z.number().int().min(0, 'Pages ahead must be non-negative'),
  pagesBehind: z.number().int().min(0, 'Pages behind must be non-negative'),
  preloadCurrent: z.boolean(),
  preloadPrevious: z.boolean(),
}).readonly()

/**
 * PDF processing validation schema
 */
export const PdfSchema = z.object({
  targetHeight: z.number().int().positive('Target height must be positive'),
  contextType: z.literal('2d'),
}).readonly()

/**
 * Image processing validation schema
 */
export const ImageSchema = z.object({
  webpQuality: z.number().min(0).max(1, 'WebP quality must be between 0 and 1'),
  format: z.literal('image/webp'),
  extension: z.literal('.webp'),
}).readonly()

/**
 * Upload limits validation schema
 */
export const UploadLimitsSchema = z.object({
  maxBodySize: z.number().int().positive('Max body size must be positive'),
  maxBodySizeMB: z.number().int().positive('Max body size MB must be positive'),
  maxPdfPages: z.number().int().positive('Max PDF pages must be positive'),
  maxClientFileSize: z.number().int().positive('Max client file size must be positive'),
  concurrentUploads: z.number().int().positive('Concurrent uploads must be positive'),
}).readonly()

/**
 * Storage bucket validation schema
 */
export const StorageBucketSchema = z.object({
  name: z.literal('magazines'),
  cacheControlSeconds: z.number().int().positive('Cache control seconds must be positive'),
  defaultUpsert: z.boolean(),
  duplex: z.literal('half'),
}).readonly()

/**
 * File listing validation schema
 */
export const FileListingSchema = z.object({
  limit: z.number().int().positive('Limit must be positive'),
  defaultLimit: z.number().int().positive('Default limit must be positive'),
}).readonly()

/**
 * File naming validation schema
 */
export const FileNamingSchema = z.object({
  pagePrefix: z.string().min(1, 'Page prefix cannot be empty'),
  pagePadding: z.number().int().positive('Page padding must be positive'),
  coverFilename: z.string().min(1, 'Cover filename cannot be empty'),
  extension: z.string().startsWith('.', 'Extension must start with dot'),
  paddingChar: z.string().length(1, 'Padding char must be single character'),
}).readonly()
/**
 * Error handling validation schema
 */
export const ErrorSchema = z.object({
  defaultMessage: z.string().min(1, 'Default message cannot be empty'),
  defaultCode: z.string().min(1, 'Default code cannot be empty'),
  includeStackTrace: z.boolean(),
}).readonly()

/**
 * Logging validation schema
 */
export const LoggingSchema = z.object({
  enableConsole: z.boolean(),
  defaultLevel: z.enum(['debug', 'info', 'warn', 'error']),
  includeTimestamp: z.boolean(),
  timezone: z.string().min(1, 'Timezone cannot be empty'),
}).readonly()

/**
 * Performance validation schema
 */
export const PerformanceSchema = z.object({
  maxExecutionTime: z.number().int().positive('Max execution time must be positive'),
  maxCyclomaticComplexity: z.number().int().positive('Max complexity must be positive'),
  maxFunctionLength: z.number().int().positive('Max function length must be positive'),
}).readonly()

/**
 * Complete magazine configuration validation schema
 */
export const MagazineConfigSchema = z.object({
  aspectRatio: AspectRatioSchema,
  viewport: ViewportSchema,
  preload: PreloadSchema,
}).readonly()

/**
 * Complete upload configuration validation schema
 */
export const UploadConfigSchema = z.object({
  pdf: PdfSchema,
  image: ImageSchema,
  limits: UploadLimitsSchema,
}).readonly()

/**
 * Complete storage configuration validation schema
 */
export const StorageConfigSchema = z.object({
  bucket: StorageBucketSchema,
  listing: FileListingSchema,
  fileNaming: FileNamingSchema,
}).readonly()

/**
 * Complete system configuration validation schema
 */
export const SystemConfigSchema = z.object({
  errors: ErrorSchema,
  logging: LoggingSchema,
  performance: PerformanceSchema,
}).readonly()

/**
 * Complete application configuration validation schema
 */
export const AppConfigSchema = z.object({
  magazine: MagazineConfigSchema,
  upload: UploadConfigSchema,
  storage: StorageConfigSchema,
  system: SystemConfigSchema,
}).readonly()

/**
 * Configuration validation function
 * Validates the entire application configuration against the schema
 */
export function validateAppConfig(config: unknown): void {
  try {
    AppConfigSchema.parse(config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
        .join('\n')
      
      throw new Error(
        `Configuration validation failed:\n${errorMessages}\n\n` +
        'Please check your configuration values and ensure they meet the requirements.'
      )
    }
    throw error
  }
}

/**
 * Runtime configuration type validation helpers
 */
export const CONFIG_TYPE_GUARDS = {
  /**
   * Type guard for aspect ratio configuration
   */
  isAspectRatioConfig: (value: unknown): value is z.infer<typeof AspectRatioSchema> => {
    return AspectRatioSchema.safeParse(value).success
  },
  
  /**
   * Type guard for viewport configuration
   */
  isViewportConfig: (value: unknown): value is z.infer<typeof ViewportSchema> => {
    return ViewportSchema.safeParse(value).success
  },
  
  /**
   * Type guard for complete app configuration
   */
  isAppConfig: (value: unknown): value is z.infer<typeof AppConfigSchema> => {
    return AppConfigSchema.safeParse(value).success
  },
} as const