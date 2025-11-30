/**
 * Custom React Hooks
 * 
 * This module exports all custom hooks used throughout the application.
 * Hooks are organized by functionality and follow React best practices.
 */

// Supabase client hook
export { useSupabaseClient } from './useSupabaseClient'

// Upload functionality hooks
export { useUploadForm } from './useUploadForm'
export { useUploadProgress } from './useUploadProgress'
export { useUploadLogs } from './useUploadLogs'
export { useStorageService } from './useStorageService'
export { useFileUpload } from './useFileUpload'
export type { UseFileUploadOptions, UseFileUploadReturn } from './useFileUpload'
export { usePDFProcessor } from './usePDFProcessor'
export type { ProcessedPDF, PDFProcessorOptions, UsePDFProcessorReturn } from './usePDFProcessor'
export { useUploadPersistence } from './useUploadPersistence'
export type { UploadState } from './useUploadPersistence'
export { useWakeLock } from './useWakeLock'
export type { UseWakeLockReturn } from './useWakeLock'

// Responsive dimensions hook
export { useResponsiveDimensions } from './useResponsiveDimensions'
export type { AspectRatio, Dimensions } from './useResponsiveDimensions'
