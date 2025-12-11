/**
 * Configuration Type Definitions
 * 
 * TypeScript interfaces and types for the centralized configuration system.
 * Provides type safety and IntelliSense support for all configuration values.
 */

/**
 * Aspect ratio configuration type
 */
export interface AspectRatioConfig {
  readonly width: number
  readonly height: number
}

/**
 * Viewport configuration type
 */
export interface ViewportConfig {
  readonly minWidth: number
  readonly maxWidth: number
  readonly defaultWidth: number
  readonly heightRatio: number
  readonly defaultHeight: number
  readonly loadingHeight: number
}

/**
 * Preload configuration type
 */
export interface PreloadConfig {
  readonly pagesAhead: number
  readonly pagesBehind: number
  readonly preloadCurrent: boolean
  readonly preloadPrevious: boolean
}

/**
 * PDF processing configuration type
 */
export interface PdfConfig {
  readonly targetHeight: number
  readonly contextType: '2d'
}

/**
 * Image processing configuration type
 */
export interface ImageConfig {
  readonly webpQuality: number
  readonly format: 'image/webp'
  readonly extension: '.webp'
}

/**
 * Upload limits configuration type
 */
export interface UploadLimitsConfig {
  readonly maxBodySize: number
  readonly maxBodySizeMB: number
  readonly maxPdfPages: number
  readonly maxClientFileSize: number
  readonly concurrentUploads: number
}

/**
 * Storage bucket configuration type
 */
export interface StorageBucketConfig {
  readonly name: 'magazines'
  readonly cacheControlSeconds: number
  readonly defaultUpsert: boolean
  readonly duplex: 'half'
}

/**
 * File listing configuration type
 */
export interface FileListingConfig {
  readonly limit: number
  readonly defaultLimit: number
}

/**
 * File naming configuration type
 */
export interface FileNamingConfig {
  readonly pagePrefix: string
  readonly pagePadding: number
  readonly coverFilename: string
  readonly extension: string
  readonly paddingChar: string
}
/**
 * Error handling configuration type
 */
export interface ErrorConfig {
  readonly defaultMessage: string
  readonly defaultCode: string
  readonly includeStackTrace: boolean
}

/**
 * Logging configuration type
 */
export interface LoggingConfig {
  readonly enableConsole: boolean
  readonly defaultLevel: 'debug' | 'info' | 'warn' | 'error'
  readonly includeTimestamp: boolean
  readonly timezone: string
}

/**
 * Performance monitoring configuration type
 */
export interface PerformanceConfig {
  readonly maxExecutionTime: number
  readonly maxCyclomaticComplexity: number
  readonly maxFunctionLength: number
}

/**
 * Complete magazine configuration type
 */
export interface MagazineConfigType {
  readonly aspectRatio: AspectRatioConfig
  readonly viewport: ViewportConfig
  readonly preload: PreloadConfig
}

/**
 * Complete upload configuration type
 */
export interface UploadConfigType {
  readonly pdf: PdfConfig
  readonly image: ImageConfig
  readonly limits: UploadLimitsConfig
}

/**
 * Complete storage configuration type
 */
export interface StorageConfigType {
  readonly bucket: StorageBucketConfig
  readonly listing: FileListingConfig
  readonly fileNaming: FileNamingConfig
}

/**
 * Complete system configuration type
 */
export interface SystemConfigType {
  readonly errors: ErrorConfig
  readonly logging: LoggingConfig
  readonly performance: PerformanceConfig
}

/**
 * Complete application configuration type
 */
export interface AppConfigType {
  readonly magazine: MagazineConfigType
  readonly upload: UploadConfigType
  readonly storage: StorageConfigType
  readonly system: SystemConfigType
}

/**
 * Configuration validation function type
 */
export type ConfigValidator<T> = (value: T) => boolean

/**
 * Configuration helper function types
 */
export interface ConfigHelpers {
  getAspectRatio(): number
  getMaxViewportHeight(windowHeight: number): number
  getCacheControlHeader(): string
  getPageFilename(pageNumber: number): string
  getPreloadRange(currentPage: number, totalPages: number): number[]
}

/**
 * Configuration validators interface
 */
export interface ConfigValidators {
  isValidViewportWidth: ConfigValidator<number>
  isValidImageQuality: ConfigValidator<number>
  isValidFileSize: ConfigValidator<number>
  isValidPageCount: ConfigValidator<number>
}