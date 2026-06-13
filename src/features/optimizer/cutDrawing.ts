// Primitivas puras de dibujo del plan de corte, extraídas de CutLayoutDiagram.tsx para reusarlas en
// la vista de taller de órdenes (orders/WorkshopBoardSvg). No contienen JSX ni estado: solo la
// paleta, la firma por dimensión y la geometría de los lados/tapacanto. La lógica es idéntica a la
// que vivía inline en el optimizador.

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

export const EDGE_COLOR = '#d9480f' // color del tapacanto en el diagrama

export const SIDE_LABELS_ES: Record<EdgeSide, string> = {
  top: 'Superior',
  bottom: 'Inferior',
  left: 'Izquierdo',
  right: 'Derecho',
}

// Forma estructural mínima que comparten PlacedPiece (optimizer) y CutPiece (orders): alcanza para
// dibujar el rectángulo a escala, su color por firma y las bandas de tapacanto.
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

// Las piezas iguales comparten dimensiones nominales (originalWidth×originalHeight).
export const pieceSig = (p: Pick<DrawablePiece, 'originalWidth' | 'originalHeight'>) =>
  `${p.originalWidth}×${p.originalHeight}`

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export const bandedSides = (p: Pick<DrawablePiece, 'edges'>): EdgeSide[] => p.edges?.sides ?? []

export interface SideLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

// Coordenadas del lado geométrico de un rect (x,y,w,h). Los edges de la respuesta ya son geométricos.
export const sideLine = (side: EdgeSide, x: number, y: number, w: number, h: number): SideLine => {
  switch (side) {
    case 'top':
      return { x1: x, y1: y, x2: x + w, y2: y }
    case 'bottom':
      return { x1: x, y1: y + h, x2: x + w, y2: y + h }
    case 'left':
      return { x1: x, y1: y, x2: x, y2: y + h }
    case 'right':
      return { x1: x + w, y1: y, x2: x + w, y2: y + h }
  }
}
