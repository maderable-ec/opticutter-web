import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import { clamp } from 'src/shared/utils/cutDrawing'
import type { CandidatePosition, PlacedPiece, WholeOffcut, SheetFit } from '../types'

// The layout editor's layer over a sheet. Rendered through `SheetSvg`'s `overlay` slot, i.e. INSIDE
// the rotated board group, so everything here is in the sheet's own millimetres — the same space the
// server's candidates and free rectangles come in. Nothing here judges validity: the green zones and
// the snap points are exactly what `/optimize/layout/candidates` returned, and a click places the
// piece only on one of them.

const OK = '#2f9e44'
const BAD = '#e03131'
const PREVIEW = '#1f6f8b'

export interface HandInfo {
  label: string
  width: number
  height: number
  rotated: boolean
}

interface EditorOverlayProps {
  sheetWidth: number
  sheetHeight: number
  // The piece in hand, already in its current orientation, or null.
  hand: HandInfo | null
  fits: SheetFit | null
  // Where the piece in hand sits on this sheet right now, if it does.
  origin?: { x: number; y: number; width: number; height: number } | null
  // The other pieces of the sheet, only to name the one a bad drop would hit.
  pieces: PlacedPiece[]
  pieceName: (pieceId: string) => string
  onPlace: (position: CandidatePosition) => void
  // Tells the page what the pointer would do right now: the text under the sheet.
  onStatus: (status: string | null) => void
  // An offcut extension being previewed, drawn dashed.
  preview?: WholeOffcut | null
  // A drag in progress, and where the pointer was when it started. While it lasts the overlay
  // follows the pointer through window listeners (it may leave the sheet), and on release it
  // places the piece on the nearest valid spot — or, when there is none, hands the reason to
  // `onDragCancel` and the piece stays where it was.
  drag?: { clientX: number; clientY: number } | null
  onDragCancel?: (reason: string) => void
}

// From screen pixels to the sheet's millimetres, through the rotation and the zoom/pan transform
// of every group above the element.
const toSheetAt = (
  el: SVGGraphicsElement | null,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null => {
  const ctm = el?.getScreenCTM()
  if (!ctm) return null
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}

const toSheet = (e: MouseEvent<SVGRectElement>) => toSheetAt(e.currentTarget, e.clientX, e.clientY)

const EditorOverlay = ({
  sheetWidth,
  sheetHeight,
  hand,
  fits,
  origin,
  pieces,
  pieceName,
  onPlace,
  onStatus,
  preview,
  drag = null,
  onDragCancel,
}: EditorOverlayProps) => {
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const surfaceRef = useRef<SVGRectElement>(null)
  // The release of a drag is followed by a `click`; it must not place twice. A timestamp rather
  // than a flag: when the surface unmounts before that click arrives, a flag would stay up and eat
  // the first click of the next placement.
  const droppedAt = useRef(0)
  const dot = clamp(Math.max(sheetWidth, sheetHeight) * 0.006, 4, 14)

  const w = hand?.width ?? 0
  const h = hand?.height ?? 0
  const positions = hand && fits ? fits.positions.filter((p) => p.rotated === hand.rotated) : []
  const zones = hand && fits ? fits.freeRects.filter((r) => r.width >= w && r.height >= h) : []

  // The valid position closest to a point, within a piece's reach of it. Computed from the event's
  // own coordinates on a click, never from the last hover: a tap on a touch screen has no hover
  // before it, and even a mouse can click before the render that followed its last move.
  const snapAt = (at: { x: number; y: number } | null): CandidatePosition | null => {
    if (!at || !positions.length) return null
    let best: CandidatePosition | null = null
    let bestDistance = Infinity
    for (const p of positions) {
      const d = Math.hypot(at.x - (p.x + w / 2), at.y - (p.y + h / 2))
      if (d < bestDistance) {
        best = p
        bestDistance = d
      }
    }
    return bestDistance <= Math.max(w, h) ? best : null
  }
  const snapped = snapAt(pointer)

  const reasonAt = (at: { x: number; y: number }): string => {
    if (!fits) return 'Buscando dónde entra…'
    if (!positions.length) {
      return hand?.rotated
        ? 'Girada no entra en esta hoja.'
        : 'No entra en esta hoja; prueba girarla o usa otra hoja.'
    }
    const box = { x0: at.x - w / 2, y0: at.y - h / 2, x1: at.x + w / 2, y1: at.y + h / 2 }
    const hit = pieces.find(
      (p) => box.x0 < p.x + p.width && box.x1 > p.x && box.y0 < p.y + p.height && box.y1 > p.y,
    )
    return hit ? `Aquí se cruza con «${pieceName(hit.pieceId)}».` : 'Aquí no hay espacio libre.'
  }

  const handleMove = (e: MouseEvent<SVGRectElement>) => {
    const at = toSheet(e)
    setPointer(at)
    if (!at || !hand) return
    onStatus(snapAt(at) ? 'Clic para soltarla aquí.' : reasonAt(at))
  }

  const handleClick = (e: MouseEvent<SVGRectElement>) => {
    if (performance.now() - droppedAt.current < 300) return
    const at = toSheet(e)
    if (!at || !hand) return
    setPointer(at)
    const target = snapAt(at)
    if (target) onPlace(target)
    else onStatus(reasonAt(at))
  }

  // The drag's window listeners read the latest render through this, so the answer the server
  // sends mid-drag (the spots) is used the moment it lands.
  const latest = useRef({ snapAt, reasonAt, hand, fits, onPlace, onStatus, onDragCancel })
  useEffect(() => {
    latest.current = { snapAt, reasonAt, hand, fits, onPlace, onStatus, onDragCancel }
  })

  const dragging = drag !== null
  useEffect(() => {
    if (!drag) return
    const at = (x: number, y: number) => toSheetAt(surfaceRef.current, x, y)
    setPointer(at(drag.clientX, drag.clientY))
    const move = (e: PointerEvent) => {
      const where = at(e.clientX, e.clientY)
      setPointer(where)
      const l = latest.current
      if (!where || !l.hand) return
      l.onStatus(
        !l.fits
          ? 'Buscando dónde entra…'
          : l.snapAt(where)
            ? 'Suelta para dejarla aquí.'
            : `${l.reasonAt(where)} Si la sueltas, vuelve a su lugar.`,
      )
    }
    const up = (e: PointerEvent) => {
      const where = at(e.clientX, e.clientY)
      const l = latest.current
      droppedAt.current = performance.now()
      const target = where ? l.snapAt(where) : null
      if (target) l.onPlace(target)
      else
        l.onDragCancel?.(
          !l.fits
            ? 'Todavía se estaba buscando dónde entra; vuelve a intentarlo.'
            : `${where ? l.reasonAt(where) : 'Fuera de la hoja.'} La pieza volvió a su lugar.`,
        )
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    // Keyed on whether a drag is on, not on its start point: one set of listeners per drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  // The ghost: on the snapped position when there is one, under the pointer (red) otherwise.
  const ghost = hand
    ? snapped
      ? { x: snapped.x, y: snapped.y, ok: true }
      : pointer
        ? { x: pointer.x - w / 2, y: pointer.y - h / 2, ok: false }
        : null
    : null

  return (
    <g>
      {preview && (
        <rect
          x={preview.x}
          y={preview.y}
          width={preview.width}
          height={preview.height}
          fill={PREVIEW}
          fillOpacity={0.12}
          stroke={PREVIEW}
          strokeWidth={2.5}
          strokeDasharray="10 6"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}

      {hand && (
        <>
          {/* The piece's current spot, lifted: still drawn by the sheet, veiled here. */}
          {origin && (
            <rect
              x={origin.x}
              y={origin.y}
              width={origin.width}
              height={origin.height}
              fill="#ffffff"
              fillOpacity={0.65}
              stroke="#495057"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}

          {/* Free space the piece fits in, as it is turned right now. */}
          {zones.map((r, i) => (
            <rect
              key={`zone-${i}`}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              fill={OK}
              fillOpacity={0.1}
              stroke={OK}
              strokeWidth={1}
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ))}

          {positions.map((p, i) => (
            <circle
              key={`spot-${i}`}
              cx={p.x + w / 2}
              cy={p.y + h / 2}
              r={dot}
              fill={OK}
              fillOpacity={0.7}
              pointerEvents="none"
            />
          ))}

          {ghost && (
            <rect
              x={ghost.x}
              y={ghost.y}
              width={w}
              height={h}
              fill={ghost.ok ? OK : BAD}
              fillOpacity={0.35}
              stroke={ghost.ok ? OK : BAD}
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}

          {/* Last, so it takes every pointer event while a piece is in hand. */}
          <rect
            ref={surfaceRef}
            x={0}
            y={0}
            width={sheetWidth}
            height={sheetHeight}
            fill="transparent"
            onMouseMove={dragging ? undefined : handleMove}
            onMouseLeave={() => {
              if (dragging) return
              setPointer(null)
              onStatus(null)
            }}
            onClick={handleClick}
            style={{ cursor: dragging ? 'grabbing' : snapped ? 'copy' : 'not-allowed' }}
          />
        </>
      )}
    </g>
  )
}

export default EditorOverlay
