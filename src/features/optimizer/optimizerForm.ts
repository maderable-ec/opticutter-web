import type { BoardProduct } from 'src/features/products/types'
import type { EdgeSide, MaterialInput, MaterialSourceKind, RequirementInput } from './types'

// --- Modelo del formulario (en edición; los números pueden ser '' mientras se escriben) ---

export interface MaterialForm {
  uid: string
  source: MaterialSourceKind
  boardId: string // catálogo: id del producto board
  label: string // inline (manual/retazos)
  height: number | string
  width: number | string
  thickness: number | string
  costPerUnit: number | string
}

export interface EdgeBandingForm {
  productId: string // '' = sin tapacanto
  sides: Record<EdgeSide, boolean>
}

export interface RequirementForm {
  materialUid: string
  height: number | string
  width: number | string
  quantity: number | string
  priority: number | string
  label: string
  canRotate: boolean
  edgeBanding: EdgeBandingForm
}

export const SOURCE_LABELS: Record<MaterialSourceKind, string> = {
  catalog: 'Catálogo',
  manual: 'Manual',
  companyOffcut: 'Retazo empresa',
  clientOffcut: 'Retazo cliente',
}

// Lados en el orden nominal del contrato (top,bottom,left,right) con su etiqueta legible.
export const EDGE_SIDES: { key: EdgeSide; label: string }[] = [
  { key: 'top', label: 'Superior' },
  { key: 'bottom', label: 'Inferior' },
  { key: 'left', label: 'Izquierdo' },
  { key: 'right', label: 'Derecho' },
]

let seq = 0
export const nextUid = () => `mat-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const emptyEdgeBanding = (): EdgeBandingForm => ({
  productId: '',
  sides: { top: false, bottom: false, left: false, right: false },
})

export const emptyCatalogMaterial = (): MaterialForm => ({
  uid: nextUid(),
  source: 'catalog',
  boardId: '',
  label: '',
  height: '',
  width: '',
  thickness: '',
  costPerUnit: '',
})

export const emptyRequirement = (materialUid = ''): RequirementForm => ({
  materialUid,
  height: '',
  width: '',
  quantity: 1,
  priority: 0,
  label: '',
  canRotate: false,
  edgeBanding: emptyEdgeBanding(),
})

export const isInlineSource = (source: MaterialSourceKind): boolean => source !== 'catalog'

export const isMaterialValid = (m: MaterialForm): boolean =>
  m.source === 'catalog'
    ? !!m.boardId
    : Number(m.height) > 0 && Number(m.width) > 0 && Number(m.thickness) > 0

export const selectedSides = (eb: EdgeBandingForm): EdgeSide[] =>
  EDGE_SIDES.filter((s) => eb.sides[s.key]).map((s) => s.key)

export const hasEdgeBanding = (eb: EdgeBandingForm): boolean =>
  eb.productId !== '' && selectedSides(eb).length > 0

// uids de materiales válidos: las piezas solo pueden referenciar a uno de estos.
export const validMaterialUids = (materials: MaterialForm[]): Set<string> =>
  new Set(materials.filter(isMaterialValid).map((m) => m.uid))

// Una pieza es válida (entra a la optimización) si referencia un material válido y tiene medidas > 0.
export const isRequirementValid = (r: RequirementForm, validUids: Set<string>): boolean =>
  validUids.has(r.materialUid) && Number(r.height) > 0 && Number(r.width) > 0

// Fila "en blanco" (recién agregada, sin tocar): no se resalta como error aunque sea inválida.
export const isRequirementEmpty = (r: RequirementForm): boolean =>
  r.height === '' && r.width === '' && !r.label.trim() && !hasEdgeBanding(r.edgeBanding)

// Clon profundo de una pieza (edgeBanding.sides es objeto) para duplicar filas.
export const cloneRequirement = (r: RequirementForm): RequirementForm => ({
  ...r,
  edgeBanding: { productId: r.edgeBanding.productId, sides: { ...r.edgeBanding.sides } },
})

export interface PiecesSummary {
  pieces: number // filas válidas
  units: number // Σ cantidad de las filas válidas
  areaM2: number // Σ alto·ancho·cant / 1e6
  invalid: number // filas con datos pero inválidas
}

export const piecesSummary = (
  requirements: RequirementForm[],
  materials: MaterialForm[],
): PiecesSummary => {
  const validUids = validMaterialUids(materials)
  let pieces = 0
  let units = 0
  let areaM2 = 0
  let invalid = 0
  for (const r of requirements) {
    if (isRequirementValid(r, validUids)) {
      const qty = Number(r.quantity) || 1
      pieces += 1
      units += qty
      areaM2 += (Number(r.height) * Number(r.width) * qty) / 1_000_000
    } else if (!isRequirementEmpty(r)) {
      invalid += 1
    }
  }
  return { pieces, units, areaM2, invalid }
}

// Nombre legible de un material para el dropdown de piezas y el diagrama.
export const materialLabel = (m: MaterialForm, boards: BoardProduct[]): string => {
  if (m.source === 'catalog') {
    // El id del producto puede llegar como número en runtime; comparamos como string.
    const b = boards.find((x) => String(x.id) === String(m.boardId))
    return b ? `${b.name} (${b.code})` : 'Tablero sin elegir'
  }
  if (m.label.trim()) return m.label.trim()
  const dims = [m.height, m.width, m.thickness].filter((v) => v !== '' && v != null).join('×')
  return dims ? `${SOURCE_LABELS[m.source]} ${dims}` : SOURCE_LABELS[m.source]
}

export interface BuiltPayload {
  materials: MaterialInput[]
  requirements: RequirementInput[]
  validCount: number
}

// Construye materials[] + requirements[] del contrato a partir del formulario. Cada material usa su
// `uid` como `key`; las piezas lo referencian por `materialKey`. Solo se incluyen materiales
// realmente referenciados por alguna pieza válida.
export const buildPayload = (
  materials: MaterialForm[],
  requirements: RequirementForm[],
): BuiltPayload => {
  const validMaterials = materials.filter(isMaterialValid)
  const validUids = validMaterialUids(materials)

  const mappedMaterials: MaterialInput[] = validMaterials.map((m) =>
    m.source === 'catalog'
      ? { key: m.uid, source: 'catalog', productId: Number(m.boardId) }
      : {
          key: m.uid,
          source: m.source,
          height: Number(m.height),
          width: Number(m.width),
          thickness: Number(m.thickness),
          costPerUnit: Number(m.costPerUnit) || 0,
          label: m.label.trim() || undefined,
        },
  )

  const validReqs = requirements.filter((r) => isRequirementValid(r, validUids))

  const mappedReqs: RequirementInput[] = validReqs.map((r) => {
    const sides = selectedSides(r.edgeBanding)
    const edgeBanding =
      r.edgeBanding.productId && sides.length
        ? { productId: Number(r.edgeBanding.productId), sides }
        : undefined
    return {
      materialKey: r.materialUid,
      height: Number(r.height),
      width: Number(r.width),
      quantity: Number(r.quantity) || 1,
      priority: Number(r.priority) || 0,
      label: r.label.trim() || undefined,
      canRotate: r.canRotate,
      ...(edgeBanding ? { edgeBanding } : {}),
    }
  })

  const usedUids = new Set(mappedReqs.map((r) => r.materialKey))
  const materialsUsed = mappedMaterials.filter((m) => usedUids.has(m.key))

  return { materials: materialsUsed, requirements: mappedReqs, validCount: mappedReqs.length }
}

// --- Nomenclatura de canto (negocio) ---
// L = lado largo = left/right (los lados a lo largo de la pieza)
// C = lado corto = top/bottom (los lados a lo ancho de la pieza)

export const CANTO_NOTATIONS = ['—', '1L', '2L', '1C', '2C', '1L1C', '1L2C', '2L1C', '4L'] as const
export type CantoNotation = (typeof CANTO_NOTATIONS)[number]

const NOTATION_TO_SIDES: Record<CantoNotation, Record<EdgeSide, boolean>> = {
  '—':    { top: false, bottom: false, left: false, right: false },
  '1L':   { top: false, bottom: false, left: true,  right: false },
  '2L':   { top: false, bottom: false, left: true,  right: true  },
  '1C':   { top: true,  bottom: false, left: false, right: false },
  '2C':   { top: true,  bottom: true,  left: false, right: false },
  '1L1C': { top: true,  bottom: false, left: true,  right: false },
  '1L2C': { top: true,  bottom: true,  left: true,  right: false },
  '2L1C': { top: true,  bottom: false, left: true,  right: true  },
  '4L':   { top: true,  bottom: true,  left: true,  right: true  },
}

export function notationFromSides(sides: Record<EdgeSide, boolean>): CantoNotation {
  const l = (sides.left ? 1 : 0) + (sides.right ? 1 : 0)
  const c = (sides.top ? 1 : 0) + (sides.bottom ? 1 : 0)
  if (l === 0 && c === 0) return '—'
  if (l === 2 && c === 2) return '4L'
  let key = ''
  if (l > 0) key += `${l}L`
  if (c > 0) key += `${c}C`
  return (key as CantoNotation) ?? '—'
}

export function sidesFromNotation(n: string): Record<EdgeSide, boolean> {
  return NOTATION_TO_SIDES[n as CantoNotation] ?? NOTATION_TO_SIDES['—']
}

export const CANTO_NOTATION_RE = /^(?:4[Ll]|[12][Ll](?:[12][Cc])?|[12][Cc])$/
