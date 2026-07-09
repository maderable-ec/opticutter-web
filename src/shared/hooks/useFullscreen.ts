import { useCallback, useEffect, useRef, useState } from 'react'

// Wraps the Fullscreen API for a single container element (e.g. a diagram card),
// so it can be blown up to fill the screen — useful on tablets in the workshop where
// screen space for the cut diagram is scarce.
const useFullscreen = <T extends HTMLElement>() => {
  const containerRef = useRef<T | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Some browsers (older iOS Safari) don't expose element-level fullscreen at all.
  const isSupported =
    typeof document !== 'undefined' && !!document.documentElement.requestFullscreen

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void containerRef.current?.requestFullscreen()
    }
  }, [])

  return { containerRef, isFullscreen, isSupported, toggle }
}

export default useFullscreen
