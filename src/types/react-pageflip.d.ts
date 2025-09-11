declare module 'react-pageflip' {
  type HTMLFlipBookProps = {
    width?: number
    height?: number
    showCover?: boolean
    className?: string
    style?: React.CSSProperties
    size?: 'fixed' | 'stretch'
    maxShadowOpacity?: number
    drawShadow?: boolean
    usePortrait?: boolean
    mobileScrollSupport?: boolean
    children?: React.ReactNode
  }
  const HTMLFlipBook: React.ComponentType<HTMLFlipBookProps>
  export default HTMLFlipBook
}

