// Pure drawing primitives for the cut plan, extracted from CutLayoutDiagram.tsx for reuse in the
// workshop order view (orders/WorkshopBoardSvg). No JSX or state: just the color palette, the
// dimension signature, and edge banding geometry. Logic is identical to what was inline in the optimizer.

import type { EdgeSide, PlacedPieceEdges } from './types'

// Paleta estable para colorear piezas por dimensión (firma). Colores tipo Tableau, legibles.
export const PALETTE = [
  '#4e79a7',
  '#59a14f',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#b07aa1',
  '#edc948',
  '#ff9da7',
  '#9c755f',
  '#86bcb6',
]

export const EDGE_COLOR = '#d9480f' // edge banding color in the diagram

export const SIDE_LABELS_ES: Record<EdgeSide, string> = {
  top: 'Superior',
  bottom: 'Inferior',
  left: 'Izquierdo',
  right: 'Derecho',
}

// Minimal structural shape shared by PlacedPiece (optimizer) and CutPiece (orders): enough to
// draw the scaled rectangle, its signature color, and the edge banding strips.
export interface DrawablePiece {
  x: number
  y: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  rotated: boolean
  edges?: PlacedPieceEdges | null
}

// Identical pieces share the same nominal dimensions (originalWidth×originalHeight).
export const pieceSig = (p: Pick<DrawablePiece, 'originalWidth' | 'originalHeight'>) =>
  `${p.originalWidth}×${p.originalHeight}`

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

// Rotates the board content 90° clockwise and repositions it in the positive quadrant (the box
// [0,W]×[0,H] becomes [0,H]×[0,W]). Pair with a viewBox with swapped sides (H wide × W tall).
export const boardRotation = (height: number) => `translate(${height} 0) rotate(90)`

// Counter-rotation so a <text> inside the rotated group stays horizontal and readable, pivoting
// on its own anchor (use with textAnchor="middle" / dominantBaseline="central").
export const uprightText = (x: number, y: number) => `rotate(-90 ${x} ${y})`

export const bandedSides = (p: Pick<DrawablePiece, 'edges'>): EdgeSide[] => p.edges?.sides ?? []

export interface SideLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

// Edge banding line offset INWARD: with offset t/2 the outer edge of the stroke (thickness t)
// aligns with the piece boundary and the band grows inward. This shows which piece owns the edge
// without overlapping the cut line or invading the neighbor. Use with strokeLinecap="butt" and the
// same thickness t; adjacent two-side bands overlap cleanly at the corner.
export const insetSideLine = (
  side: EdgeSide,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
): SideLine => {
  const o = t / 2
  switch (side) {
    case 'top':
      return { x1: x, y1: y + o, x2: x + w, y2: y + o }
    case 'bottom':
      return { x1: x, y1: y + h - o, x2: x + w, y2: y + h - o }
    case 'left':
      return { x1: x + o, y1: y, x2: x + o, y2: y + h }
    case 'right':
      return { x1: x + w - o, y1: y, x2: x + w - o, y2: y + h }
  }
}
