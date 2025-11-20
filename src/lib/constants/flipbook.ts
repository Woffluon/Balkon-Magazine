/**
 * Flipbook Configuration Constants
 * 
 * Defines all configuration values for the flipbook viewer component
 * including dimensions, aspect ratios, and display settings.
 */

/**
 * Page dimensions and aspect ratio
 */
export const FLIPBOOK_DIMENSIONS = {
  /** Base width for aspect ratio calculation (A4-like proportions) */
  ASPECT_WIDTH: 848,
  
  /** Base height for aspect ratio calculation (A4-like proportions) */
  ASPECT_HEIGHT: 1200,
  
  /** Minimum width for the flipbook viewer (pixels) */
  MIN_WIDTH: 300,
  
  /** Maximum width for the flipbook viewer (pixels) */
  MAX_WIDTH: 900,
  
  /** Default width fallback (pixels) */
  DEFAULT_WIDTH: 500,
  
  /** Default height fallback (pixels) */
  DEFAULT_HEIGHT: 700,
  
  /** Viewport height multiplier for maximum height calculation */
  VIEWPORT_HEIGHT_RATIO: 0.85,
} as const

/**
 * Flipbook display settings
 */
export const FLIPBOOK_SETTINGS = {
  /** Whether to show the cover page separately */
  SHOW_COVER: true,
  
  /** Size mode for the flipbook */
  SIZE_MODE: 'fixed' as const,
  
  /** Maximum shadow opacity (0.0 - 1.0) */
  MAX_SHADOW_OPACITY: 0,
  
  /** Whether to draw page shadows */
  DRAW_SHADOW: false,
  
  /** Whether to use portrait orientation */
  USE_PORTRAIT: true,
  
  /** Whether to enable mobile scroll support */
  MOBILE_SCROLL_SUPPORT: true,
} as const

/**
 * Page preloading configuration
 */
export const FLIPBOOK_PRELOAD = {
  /** Number of pages to preload ahead of current page */
  PAGES_AHEAD: 3,
  
  /** Whether to preload the current page */
  PRELOAD_CURRENT: true,
  
  /** Whether to preload the previous page */
  PRELOAD_PREVIOUS: true,
} as const

/**
 * Combined flipbook configuration
 */
export const FLIPBOOK_CONFIG = {
  DIMENSIONS: FLIPBOOK_DIMENSIONS,
  SETTINGS: FLIPBOOK_SETTINGS,
  PRELOAD: FLIPBOOK_PRELOAD,
} as const
