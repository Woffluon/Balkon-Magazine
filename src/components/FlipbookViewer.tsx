'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PageFlipAPI = { flipNext: () => void; flipPrev: () => void }
type PageFlipHandle = { pageFlip: () => PageFlipAPI }

type FlipBookComponent = React.ComponentType<{
  width?: number;
  height?: number;
  showCover?: boolean;
  className?: string;
  size?: 'fixed' | 'stretch';
  maxShadowOpacity?: number;
  drawShadow?: boolean;
  usePortrait?: boolean;
  mobileScrollSupport?: boolean;
} & { children?: React.ReactNode }>
const SafeFlipBook = dynamic(() => import('react-pageflip'), {
  ssr: false,
  loading: () => <div className="h-[700px] flex items-center justify-center text-sm text-muted-foreground">Yükleniyor...</div>,
}) as FlipBookComponent

interface FlipbookViewerProps {
  imageUrls: string[]
}

const ASPECT_W = 848
const ASPECT_H = 1200

export default function FlipbookViewer({ imageUrls }: FlipbookViewerProps) {
  const pages = useMemo(() => (imageUrls ?? []).filter(Boolean), [imageUrls])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const bookRef = useRef<PageFlipHandle | null>(null)
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 500, h: 700 })

  useEffect(() => {
    function updateSize() {
      const el = containerRef.current
      const maxW = Math.max(300, Math.min(900, el?.clientWidth || 500))
      const viewportH = typeof window !== 'undefined' ? window.innerHeight : 900
      const maxH = Math.floor(viewportH * 0.85)
      const hFromW = Math.floor(maxW * ASPECT_H / ASPECT_W)
      if (hFromW > maxH) {
        const wFromH = Math.floor(maxH * ASPECT_W / ASPECT_H)
        setDims({ w: wFromH, h: maxH })
      } else {
        setDims({ w: maxW, h: hFromW })
      }
    }
    updateSize()
    const ro = new ResizeObserver(() => updateSize())
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', updateSize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!bookRef.current) return
      if (e.key === 'ArrowRight') bookRef.current.pageFlip().flipNext()
      if (e.key === 'ArrowLeft') bookRef.current.pageFlip().flipPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!pages.length) {
    return <div className="text-sm text-muted-foreground">Gösterilecek sayfa bulunamadı.</div>
  }

  return (
    <div ref={containerRef} className="relative w-full flex justify-center items-center overflow-hidden" style={{ height: dims.h }}>
      {/* Flipbook */}
      {/* @ts-expect-error: react-pageflip type doesn't include ref but runtime supports it */}
      <SafeFlipBook ref={bookRef} width={dims.w} height={dims.h} showCover size="fixed" maxShadowOpacity={0} drawShadow={false} usePortrait mobileScrollSupport>
        {pages.map((url, index) => (
          <div key={index} className="page overflow-hidden" style={{ width: dims.w, height: dims.h }}>
            <Image src={url} alt={`Dergi Sayfası ${index + 1}`} width={dims.w} height={dims.h} className="object-cover w-full h-full" priority={index === 0} />
          </div>
        ))}
      </SafeFlipBook>

      {/* Tap zones for mobile */}
      <div onClick={() => bookRef.current?.pageFlip().flipPrev()} className="absolute inset-y-0 left-0 w-1/3 z-10 md:hidden" aria-hidden="true" />
      <div onClick={() => bookRef.current?.pageFlip().flipNext()} className="absolute inset-y-0 right-0 w-1/3 z-10 md:hidden" aria-hidden="true" />

      {/* Navigation arrows */}
      <button
        aria-label="Önceki sayfa"
        onClick={() => bookRef.current?.pageFlip().flipPrev()}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 active:scale-95 md:p-3"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        aria-label="Sonraki sayfa"
        onClick={() => bookRef.current?.pageFlip().flipNext()}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 active:scale-95 md:p-3"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  )
}

