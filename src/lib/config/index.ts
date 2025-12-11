/**
 * Configuration System Index
 * 
 * Central export point for the configuration system.
 * Provides easy access to all configuration values, types, and validation.
 * 
 * @example
 * ```typescript
 * import { APP_CONFIG, CONFIG_HELPERS } from '@/lib/config'
 * 
 * const aspectRatio = CONFIG_HELPERS.getAspectRatio()
 * const maxWidth = APP_CONFIG.magazine.viewport.maxWidth
 * const webpQuality = APP_CONFIG.upload.image.webpQuality
 * ```
 */

// Configuration values
export {
  APP_CONFIG,
  MAGAZINE_CONFIG,
  UPLOAD_CONFIG,
  STORAGE_CONFIG,
  SYSTEM_CONFIG,
  CONFIG_VALIDATORS,
  CONFIG_HELPERS,
} from './app-config'

// Type definitions from app-config
export type {
  AppConfig,
  MagazineConfig,
  UploadConfig,
  StorageConfig,
  SystemConfig,
} from './app-config'

// Type definitions from types
export type {
  AspectRatioConfig,
  ViewportConfig,
  PreloadConfig,
  PdfConfig,
  ImageConfig,
  UploadLimitsConfig,
  StorageBucketConfig,
  FileListingConfig,
  FileNamingConfig,
  ErrorConfig,
  LoggingConfig,
  PerformanceConfig,
  MagazineConfigType,
  UploadConfigType,
  StorageConfigType,
  SystemConfigType,
  AppConfigType,
  ConfigValidator,
  ConfigHelpers,
  ConfigValidators,
} from './types'

// Validation schemas and functions
export {
  AspectRatioSchema,
  ViewportSchema,
  PreloadSchema,
  PdfSchema,
  ImageSchema,
  UploadLimitsSchema,
  StorageBucketSchema,
  FileListingSchema,
  FileNamingSchema,
  ErrorSchema,
  LoggingSchema,
  PerformanceSchema,
  MagazineConfigSchema,
  UploadConfigSchema,
  StorageConfigSchema,
  SystemConfigSchema,
  AppConfigSchema,
  validateAppConfig,
  CONFIG_TYPE_GUARDS,
} from './validation'

// Environment configuration available as separate import
// export { env } from './env'

/**
 * Default configuration export
 * Provides the complete application configuration
 */
// export default APP_CONFIG