declare module 'react-pageflip' {
  export interface PageFlipAPI {
    flipNext(): void
    flipPrev(): void
    flip(page: number): void
    getCurrentPageIndex(): number
    getPageCount(): number
    turnToPage(page: number): void
  }
  
  export interface PageFlipHandle {
    pageFlip(): PageFlipAPI
  }
  
  export interface FlipEvent {
    data: number
  }
  
  export interface HTMLFlipBookProps {
    width?: number
    height?: number
    size?: 'fixed' | 'stretch'
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    showCover?: boolean
    autoSize?: boolean
    maxShadowOpacity?: number
    showPageCorners?: boolean
    disableFlipByClick?: boolean
    swipeDistance?: number
    clickEventForward?: boolean
    usePortrait?: boolean
    startPage?: number
    drawShadow?: boolean
    flippingTime?: number
    useMouseEvents?: boolean
    mobileScrollSupport?: boolean
    className?: string
    style?: React.CSSProperties
    startZIndex?: number
    renderOnlyPageLengthChange?: boolean
    onFlip?: (e: FlipEvent) => void
    onChangeOrientation?: (e: { data: 'portrait' | 'landscape' }) => void
    onChangeState?: (e: { data: 'read' | 'user_fold' | 'fold_corner' }) => void
    children?: React.ReactNode
  }
  
  const HTMLFlipBook: React.ForwardRefExoticComponent<
    HTMLFlipBookProps & React.RefAttributes<PageFlipHandle>
  >
  
  export default HTMLFlipBook
}

