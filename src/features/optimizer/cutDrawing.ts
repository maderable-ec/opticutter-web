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

// Rota el contenido del tablero 90° en horario y lo reubica en el cuadrante positivo (la caja
// [0,W]×[0,H] pasa a [0,H]×[0,W]). Combinar con un viewBox de lados intercambiados (H ancho × W alto).
export const boardRotation = (height: number) => `translate(${height} 0) rotate(90)`

// Contra-rotación para que un <text> dentro del grupo rotado quede horizontal/legible, pivotando
// sobre su propio ancla (usar con textAnchor="middle" / dominantBaseline="central").
export const uprightText = (x: number, y: number) => `rotate(-90 ${x} ${y})`

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

// Línea de tapacanto desplazada hacia DENTRO de la pieza: con offset t/2 el borde exterior del trazo
// (grosor t) coincide con el lado de la pieza y la banda crece hacia el interior. Así se ve a qué pieza
// pertenece el canto sin pisar la línea de corte ni invadir a la vecina. Usar con strokeLinecap="butt"
// y el mismo grosor t; en cantos de dos lados contiguos las bandas se solapan limpias en la esquina.
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
