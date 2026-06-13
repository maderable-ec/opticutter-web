import { useCallback, useEffect, useRef, useState } from 'react'

// Hook genérico de zoom + desplazamiento (pan) para un SVG. Aplica un transform a un <g> que envuelve
// el contenido (no toca el viewBox), de modo que los trazos con vectorEffect="non-scaling-stroke"
// siguen nítidos y el texto en unidades de usuario crece al acercar — útil para ver piezas pequeñas.
//
// Usa Pointer Events (unifica mouse/touch/lápiz). Distingue tap de arrastre por un umbral de
// movimiento y, tras un pan/pinch, traga el `click` en fase de captura: así un gesto de zoom nunca
// dispara el onClick de una pieza (clave para el "tocar = marcar cortada" del taller).

export interface UseZoomPanOptions {
  /** Acercamiento máximo respecto al encuadre (1 = ajustado). */
  maxScale?: number
  /** Factor por paso de los botones +/− y de la rueda. */
  step?: number
  /** Doble click/tap alterna acercar/ajustar. Apagar donde el tap tiene otra acción (taller). */
  doubleClickZoom?: boolean
  /** No registra gestos (el contenido queda en su encuadre). */
  disabled?: boolean
}

interface Transform {
  k: number
  tx: number
  ty: number
}

const IDENTITY: Transform = { k: 1, tx: 0, ty: 0 }
const MOVE_THRESHOLD = 8 // px: por debajo de esto un puntero cuenta como "tap", no como arrastre

const clampScale = (k: number, max: number) => Math.max(1, Math.min(max, k))

// Convierte un punto de pantalla (clientX/Y) a coordenadas del viewBox del SVG. getScreenCTM maneja el
// "letterboxing" de preserveAspectRatio="xMidYMid meet" automáticamente.
const toUserSpace = (svg: SVGSVGElement, clientX: number, clientY: number) => {
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const p = pt.matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}

// Acota la traslación para que el contenido (la región del viewBox) nunca deje hueco blanco con k >= 1.
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

  // Zoom hacia un punto de pantalla, manteniéndolo fijo bajo el cursor/dedo.
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
    const activePointers = pointers.current // estable (useRef), capturado para el cleanup

    // Captura el puntero SOLO cuando ya hay un arrastre/pinch en curso. No capturar en un tap es clave:
    // con captura activa, el navegador redirige el `click` al elemento que captura (el <svg>) en vez de
    // a la pieza de abajo, y entonces el onClick de la pieza (marcar cortada) nunca se dispararía.
    const ensureCapture = (id: number) => {
      try {
        if (!svg.hasPointerCapture(id)) svg.setPointerCapture(id)
      } catch {
        /* el navegador puede rechazar la captura; el gesto sigue funcionando sin ella */
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

      // Pinch (dos dedos): escala según la distancia, centrada en el punto medio.
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
      // Sin zoom no hay nada que desplazar (deja pasar el scroll de página según touch-action).
      if (tRef.current.k <= 1) return
      // Por debajo del umbral es un tap (con micro-temblor): no capturar, para que el click marque.
      if (!moved.current) return
      ensureCapture(e.pointerId) // arrastre real con zoom: ahora sí capturamos para no perder eventos
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

    // Captura: si hubo arrastre/pinch, descarta el click para que no marque/active una pieza.
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
