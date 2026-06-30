import { useCallback, useEffect, useRef, useState } from 'react'

// Generic zoom + pan hook for an SVG. Applies a transform to a <g> wrapping the content
// (does not touch the viewBox), so strokes with vectorEffect="non-scaling-stroke" stay crisp
// and user-space text grows when zoomed in — useful for inspecting small pieces.
//
// Uses Pointer Events (unifies mouse/touch/stylus). Distinguishes tap from drag via a movement
// threshold; after a pan/pinch, swallows the `click` in the capture phase so a zoom gesture
// never fires the onClick of a piece (critical for the "tap = mark as cut" interaction in the workshop).

export interface UseZoomPanOptions {
  /** Maximum zoom relative to the fitted view (1 = fitted). */
  maxScale?: number
  /** Scale factor per step for the +/− buttons and scroll wheel. */
  step?: number
  /** Double-click/tap toggles zoom in/fit. Disable when tap has another action (workshop). */
  doubleClickZoom?: boolean
  /** Disables all gestures (content stays at the fitted view). */
  disabled?: boolean
}

interface Transform {
  k: number
  tx: number
  ty: number
}

const IDENTITY: Transform = { k: 1, tx: 0, ty: 0 }
const MOVE_THRESHOLD = 8 // px: below this a pointer counts as a "tap", not a drag

const clampScale = (k: number, max: number) => Math.max(1, Math.min(max, k))

// Converts a screen point (clientX/Y) to SVG viewBox coordinates. getScreenCTM handles the
// preserveAspectRatio="xMidYMid meet" letterboxing automatically.
const toUserSpace = (svg: SVGSVGElement, clientX: number, clientY: number) => {
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const p = pt.matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}

// Clamps the translation so the content (viewBox region) never leaves white space at k >= 1.
const clampTranslate = (svg: SVGSVGElement, k: number, tx: number, ty: number) => {
  const vb = svg.viewBox.baseVal
  const minTx = (vb.x + vb.width) * (1 - k)
  const maxTx = vb.x * (1 - k)
  const minTy = (vb.y + vb.height) * (1 - k)
  const maxTy = vb.y * (1 - k)
  return {
    tx: Math.min(maxTx, Math.max(minTx, tx)),
    ty: Math.min(maxTy, Math.max(minTy, ty)),
  }
}

const useZoomPan = ({
  maxScale = 6,
  step = 1.6,
  doubleClickZoom = true,
  disabled = false,
}: UseZoomPanOptions = {}) => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [transform, setTransform] = useState<Transform>(IDENTITY)
  const tRef = useRef<Transform>(IDENTITY)

  const setT = useCallback((next: Transform) => {
    tRef.current = next
    setTransform(next)
  }, [])

  // Zoom toward a screen point, keeping it fixed under the cursor/finger.
  const zoomToward = useCallback(
    (factor: number, clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return
      const cur = tRef.current
      const k1 = clampScale(cur.k * factor, maxScale)
      if (k1 === cur.k) return
      const f = toUserSpace(svg, clientX, clientY)
      const cx = (f.x - cur.tx) / cur.k
      const cy = (f.y - cur.ty) / cur.k
      const { tx, ty } = clampTranslate(svg, k1, f.x - k1 * cx, f.y - k1 * cy)
      setT({ k: k1, tx, ty })
    },
    [maxScale, setT],
  )

  const zoomByCenter = useCallback(
    (factor: number) => {
      const svg = svgRef.current
      if (!svg) return
      const r = svg.getBoundingClientRect()
      zoomToward(factor, r.left + r.width / 2, r.top + r.height / 2)
    },
    [zoomToward],
  )

  const zoomIn = useCallback(() => zoomByCenter(step), [zoomByCenter, step])
  const zoomOut = useCallback(() => zoomByCenter(1 / step), [zoomByCenter, step])
  const reset = useCallback(() => setT(IDENTITY), [setT])

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchDist = useRef(0)
  const moved = useRef(false)
  const downPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || disabled) return
    const activePointers = pointers.current // stable (useRef), captured for cleanup

    // Capture the pointer ONLY once a drag/pinch is in progress. Not capturing during a tap is critical:
    // with an active capture, the browser redirects the `click` to the capturing element (the <svg>)
    // instead of the piece beneath it, so the piece's onClick (mark as cut) would never fire.
    const ensureCapture = (id: number) => {
      try {
        if (!svg.hasPointerCapture(id)) svg.setPointerCapture(id)
      } catch {
        /* browser may reject capture; gesture still works without it */
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size === 1) {
        moved.current = false
        downPos.current = { x: e.clientX, y: e.clientY }
      } else if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()]
        if (a && b) pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y)
        moved.current = true
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.current.get(e.pointerId)
      if (!prev) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      // Pinch (two fingers): scale by the distance ratio, centered on the midpoint.
      if (pointers.current.size >= 2) {
        ensureCapture(e.pointerId)
        const [a, b] = [...pointers.current.values()]
        if (a && b) {
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (pinchDist.current > 0) {
            zoomToward(dist / pinchDist.current, (a.x + b.x) / 2, (a.y + b.y) / 2)
          }
          pinchDist.current = dist
        }
        moved.current = true
        e.preventDefault()
        return
      }

      if (
        Math.hypot(e.clientX - downPos.current.x, e.clientY - downPos.current.y) > MOVE_THRESHOLD
      ) {
        moved.current = true
      }
      // Not zoomed: nothing to pan (let touch-action handle page scroll).
      if (tRef.current.k <= 1) return
      // Below the threshold it's a tap (with micro-tremor): don't capture, so the click can mark.
      if (!moved.current) return
      ensureCapture(e.pointerId) // real drag while zoomed: capture now to avoid losing pointer events
      const vPrev = toUserSpace(svg, prev.x, prev.y)
      const vNow = toUserSpace(svg, e.clientX, e.clientY)
      const cur = tRef.current
      const { tx, ty } = clampTranslate(
        svg,
        cur.k,
        cur.tx + (vNow.x - vPrev.x),
        cur.ty + (vNow.y - vPrev.y),
      )
      setT({ k: cur.k, tx, ty })
      e.preventDefault()
    }

    const endPointer = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId)
      try {
        svg.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      if (pointers.current.size < 2) pinchDist.current = 0
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomToward(e.deltaY < 0 ? step : 1 / step, e.clientX, e.clientY)
    }

    // Capture phase: if a drag/pinch occurred, swallow the click so it doesn't mark/activate a piece.
    const onClickCapture = (e: MouseEvent) => {
      if (moved.current) {
        e.stopPropagation()
        e.preventDefault()
        moved.current = false
      }
    }

    const onDblClick = (e: MouseEvent) => {
      if (!doubleClickZoom) return
      e.preventDefault()
      if (tRef.current.k > 1) reset()
      else zoomToward(2.5, e.clientX, e.clientY)
    }

    svg.addEventListener('pointerdown', onPointerDown)
    svg.addEventListener('pointermove', onPointerMove)
    svg.addEventListener('pointerup', endPointer)
    svg.addEventListener('pointercancel', endPointer)
    svg.addEventListener('wheel', onWheel, { passive: false })
    svg.addEventListener('click', onClickCapture, true)
    svg.addEventListener('dblclick', onDblClick)

    return () => {
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', endPointer)
      svg.removeEventListener('pointercancel', endPointer)
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('click', onClickCapture, true)
      svg.removeEventListener('dblclick', onDblClick)
      activePointers.clear()
    }
  }, [disabled, doubleClickZoom, reset, setT, step, zoomToward])

  return {
    svgRef,
    groupTransform: `translate(${transform.tx} ${transform.ty}) scale(${transform.k})`,
    scale: transform.k,
    isZoomed: transform.k > 1,
    zoomIn,
    zoomOut,
    reset,
  }
}

export default useZoomPan
