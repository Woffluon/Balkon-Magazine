'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'

interface ZoomContainerProps {
    children: React.ReactNode
    minScale?: number
    maxScale?: number
    onZoomChange?: (scale: number) => void
    disabled?: boolean
    locked?: boolean // If true, prevents interaction with children (e.g. page turning) even at scale 1
}

export interface ZoomContainerRef {
    zoomIn: () => void
    zoomOut: () => void
    reset: () => void
}

export const ZoomContainer = React.forwardRef<ZoomContainerRef, ZoomContainerProps>(({
    children,
    minScale = 1,
    maxScale = 4,
    onZoomChange,
    disabled = false,
    locked = false
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)

    // Refs for gesture tracking to avoid closure staleness in event listeners
    const stateRef = useRef({
        scale: 1,
        position: { x: 0, y: 0 },
        isDragging: false,
        startDragPosition: { x: 0, y: 0 },
        lastPosition: { x: 0, y: 0 },
        initialPinchDistance: null as number | null,
        initialScale: 1
    })

    // Sync stateRef with state
    useEffect(() => {
        stateRef.current.scale = scale
        stateRef.current.position = position
        stateRef.current.isDragging = isDragging
    }, [scale, position, isDragging])

    // -- Helper to update scale and notify --
    const updateScale = useCallback((newScale: number) => {
        const clamped = Math.min(Math.max(newScale, minScale), maxScale)
        setScale(clamped)
        onZoomChange?.(clamped)
        return clamped
    }, [minScale, maxScale, onZoomChange])

    // -- Imperative Handle --
    React.useImperativeHandle(ref, () => ({
        zoomIn: () => updateScale(scale + 0.5),
        zoomOut: () => updateScale(scale - 0.5),
        reset: () => {
            setScale(1)
            setPosition({ x: 0, y: 0 })
            onZoomChange?.(1)
        }
    }), [scale, updateScale, onZoomChange])

    // -- Event Handlers (Non-React for Passive: false) --

    const handleWheel = useCallback((e: WheelEvent) => {
        if (disabled) return
        e.preventDefault()
        e.stopPropagation()

        const delta = -e.deltaY * 0.005
        const currentScale = stateRef.current.scale
        const newScale = currentScale + delta
        updateScale(newScale)
    }, [disabled, updateScale])

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (disabled) return

        if (e.touches.length === 2) {
            // Start Pinch
            const touch1 = e.touches[0]
            const touch2 = e.touches[1]
            const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)

            stateRef.current.initialPinchDistance = dist
            stateRef.current.initialScale = stateRef.current.scale

            // Always prevent default on pinch to stop browser zoom
            if (e.cancelable) {
                e.preventDefault()
                e.stopPropagation()
            }
        } else if (e.touches.length === 1) {
            // Start Pan (enabled if zoomed OR locked)
            const currentScale = stateRef.current.scale

            // If locked, we allow panning even at scale 1 (per requirement 3 modification)
            // But we MUST stop propagation to prevent page flip
            if (locked) {
                if (e.cancelable) {
                    // We don't preventDefault immediately for locked unless we are sure it's a horizontal drag?
                    // Actually, to prevent flip, we might need to consume the event.
                    // But for now, let's treat it as a pan start.
                }
                // Don't return early! Fall through to drag logic
                if (e.cancelable) e.stopPropagation() // Stop flipbook from seeing this
            } else {
                if (currentScale === 1) return // Let normal scroll/flip happen if not zoomed and not locked
            }

            setIsDragging(true)
            stateRef.current.startDragPosition = { x: e.touches[0].clientX, y: e.touches[0].clientY }
            stateRef.current.lastPosition = { ...stateRef.current.position }

            // If we are dragging (zoomed or locked), prevent default to stop browser scroll
            if ((currentScale > 1 || locked) && e.cancelable) {
                e.preventDefault()
                e.stopPropagation()
            }
        }
    }, [disabled, locked])

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (disabled) return

        if (e.touches.length === 2 && stateRef.current.initialPinchDistance !== null) {
            // Pinching
            if (e.cancelable) {
                e.preventDefault()
                e.stopPropagation()
            }

            const touch1 = e.touches[0]
            const touch2 = e.touches[1]
            const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)

            const scaleChange = dist / stateRef.current.initialPinchDistance
            updateScale(stateRef.current.initialScale * scaleChange)

        } else if (e.touches.length === 1) {
            if (stateRef.current.isDragging) {
                // Panning
                if (e.cancelable) {
                    e.preventDefault()
                    e.stopPropagation()
                }

                const deltaX = e.touches[0].clientX - stateRef.current.startDragPosition.x
                const deltaY = e.touches[0].clientY - stateRef.current.startDragPosition.y

                setPosition({
                    x: stateRef.current.lastPosition.x + deltaX,
                    y: stateRef.current.lastPosition.y + deltaY
                })
            }
        }
    }, [disabled, updateScale])

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false)
        stateRef.current.initialPinchDistance = null
    }, [])

    // -- Bind Listeners --
    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        // We use non-passive listeners to be able to call preventDefault()
        // We use non-passive listeners to be able to call preventDefault()
        // and capture: true to intercept events before they reach the flipbook
        const options = { passive: false, capture: true }

        el.addEventListener('wheel', handleWheel, options)
        el.addEventListener('touchstart', handleTouchStart, options)
        el.addEventListener('touchmove', handleTouchMove, options)
        el.addEventListener('touchend', handleTouchEnd, options)

        return () => {
            el.removeEventListener('wheel', handleWheel, true)
            el.removeEventListener('touchstart', handleTouchStart, true)
            el.removeEventListener('touchmove', handleTouchMove, true)
            el.removeEventListener('touchend', handleTouchEnd, true)
        }
    }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd])

    // Reset context
    useEffect(() => {
        if (disabled) {
            setScale(1)
            setPosition({ x: 0, y: 0 })
            onZoomChange?.(1)
        }
    }, [disabled, onZoomChange])

    // Auto-reset position if scale goes back to 1 (unless locked, we might want to keep it? No, reset is safer)
    useEffect(() => {
        if (scale === 1 && !locked) {
            setPosition({ x: 0, y: 0 })
        }
    }, [scale, locked])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (disabled) return

        // If locked, we prevent default to stop page flip, but allow dragging logic below
        if (locked) {
            e.preventDefault()
            e.stopPropagation()
            // Continue to drag logic...
        } else {
            if (scale === 1) return
        }

        // Prevent default for dragging
        e.preventDefault()
        e.stopPropagation()

        setIsDragging(true)
        stateRef.current.startDragPosition = { x: e.clientX, y: e.clientY }
        stateRef.current.lastPosition = { ...position }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        e.preventDefault()
        e.stopPropagation()

        const deltaX = e.clientX - stateRef.current.startDragPosition.x
        const deltaY = e.clientY - stateRef.current.startDragPosition.y

        setPosition({
            x: stateRef.current.lastPosition.x + deltaX,
            y: stateRef.current.lastPosition.y + deltaY
        })
    }

    const handleMouseUp = (e: React.MouseEvent) => {
        if (isDragging) {
            setIsDragging(false)
            e.preventDefault()
            e.stopPropagation()
        }
    }

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden ${locked || scale > 1 ? 'touch-none' : ''}`}
            // Use Capture phase for Mouse events to intercept before children
            onMouseDownCapture={handleMouseDown}
            onMouseMoveCapture={handleMouseMove}
            onMouseUpCapture={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
                cursor: scale > 1 || locked ? (isDragging ? 'grabbing' : 'grab') : 'auto'
            }}
        >
            <div
                style={{
                    // Use translate3d for GPU acceleration
                    transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    perspective: 1000,
                    // When locked, we still want to capture events on parent, but children shouldn't be interactable
                    // But if we use Capture listeners on parent and stopPropagation, children won't receive them anyway.
                    // So we can leave pointerEvents: auto on children.
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {children}
            </div>
        </div>
    )
})

ZoomContainer.displayName = 'ZoomContainer'
