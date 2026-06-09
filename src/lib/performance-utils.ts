import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useDebounce Hook
 * Debounces a value change by a specified delay (in ms)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * useThrottle Hook
 * Throttles value updates to limit frequency (in ms)
 */
export function useThrottle<T>(value: T, limit: number = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastUpdated = useRef<number>(Date.now())

  useEffect(() => {
    const now = Date.now()
    const timePassed = now - lastUpdated.current

    if (timePassed >= limit) {
      setThrottledValue(value)
      lastUpdated.current = now
    } else {
      const remainingTime = limit - timePassed
      const handler = setTimeout(() => {
        setThrottledValue(value)
        lastUpdated.current = Date.now()
      }, remainingTime)

      return () => {
        clearTimeout(handler)
      }
    }
  }, [value, limit])

  return throttledValue
}

/**
 * useThrottleCallback Hook
 * Throttles execution of a callback function
 */
export function useThrottleCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  limit: number = 100
): (...args: Args) => void {
  const lastRan = useRef<number>(0)
  const timeoutId = useRef<NodeJS.Timeout | null>(null)
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  return useCallback(
    (...args: Args) => {
      const now = Date.now()

      if (timeoutId.current) {
        clearTimeout(timeoutId.current)
      }

      if (now - lastRan.current >= limit) {
        savedCallback.current(...args)
        lastRan.current = now
      } else {
        timeoutId.current = setTimeout(() => {
          savedCallback.current(...args)
          lastRan.current = Date.now()
        }, limit - (now - lastRan.current))
      }
    },
    [limit]
  )
}

/**
 * usePassiveEventListener Hook
 * Attaches a passive event listener for scroll or touch gestures to improve scrolling performance
 */
export function usePassiveEventListener(
  target: EventTarget | null | undefined | React.RefObject<EventTarget | null>,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: Omit<AddEventListenerOptions, 'passive'>
) {
  const savedListener = useRef(listener)

  useEffect(() => {
    savedListener.current = listener
  }, [listener])

  useEffect(() => {
    const element = target && 'current' in target ? target.current : target
    if (!element) return

    const eventListener = (event: Event) => {
      if (typeof savedListener.current === 'function') {
        savedListener.current(event)
      } else if (savedListener.current && 'handleEvent' in savedListener.current) {
        savedListener.current.handleEvent(event)
      }
    }

    const opts: AddEventListenerOptions = {
      ...options,
      passive: true,
    }

    element.addEventListener(type, eventListener, opts)

    return () => {
      element.removeEventListener(type, eventListener, opts)
    }
  }, [target, type, options])
}
