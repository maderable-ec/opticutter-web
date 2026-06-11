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
  canRotate: true,
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
  const validUids = new Set(validMaterials.map((m) => m.uid))

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

  const validReqs = requirements.filter(
    (r) => validUids.has(r.materialUid) && Number(r.height) > 0 && Number(r.width) > 0,
  )

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
