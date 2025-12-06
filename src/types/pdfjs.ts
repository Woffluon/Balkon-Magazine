import type { PageViewport } from 'pdfjs-dist'

/**
 * PDF.js render context interface
 * 
 * Defines the structure for rendering a PDF page to a canvas.
 * This interface provides type safety for the render() method parameters.
 */
export interface RenderContext {
  /** The 2D rendering context of the canvas */
  canvasContext: CanvasRenderingContext2D
  /** The viewport defining the page dimensions and transformations */
  viewport: PageViewport
  /** The canvas element (required by PDF.js RenderParameters) */
  canvas: HTMLCanvasElement | null
}

/**
 * Creates a properly typed render context for PDF.js
 * 
 * Helper function to create a RenderContext object with type safety.
 * This eliminates the need for type assertions when calling page.render().
 * 
 * @param ctx - The canvas 2D rendering context
 * @param viewport - The page viewport
 * @param canvas - Canvas element (required by PDF.js)
 * @returns A properly typed RenderContext object
 * 
 * @example
 * ```typescript
 * const canvas = document.createElement('canvas')
 * const ctx = canvas.getContext('2d')
 * if (!ctx) throw new Error('Canvas context unavailable')
 * 
 * const viewport = page.getViewport({ scale: 1.5 })
 * const renderContext = createRenderContext(ctx, viewport, canvas)
 * await page.render(renderContext).promise
 * ```
 */
export function createRenderContext(
  ctx: CanvasRenderingContext2D,
  viewport: PageViewport,
  canvas: HTMLCanvasElement | null
): RenderContext {
  return {
    canvasContext: ctx,
    viewport,
    canvas
  }
}
