import type { CutListEdge, CutListGroup } from 'src/shared/components/CutListCards'
import type { CantoSides } from 'src/shared/components/CantoPreview'
import { bandingName, cantoNotation, cantoSides } from 'src/features/review/format'
import { groupByTape, specialEdgeNotation } from 'src/shared/utils/specialEdges'
import { workshopCodesLine } from 'src/shared/utils/workshopCodes'
import type { OrderPiece, OrderPieceEdges } from './types'

// An order's frozen cut list, read: grouped by material and with each piece's tapes named. The
// table on a laptop (`OrderPiecesTable`) and the cards on a phone (`CutListCards`) both come from
// here, so the two never disagree about which tape is on which side.

export interface MaterialGroup {
  key: string
  name: string
  pieces: OrderPiece[]
  units: number
}

/**
 * The cut list by material, in the order the despiece was entered.
 *
 * Keyed on `materialKey` and NOT on `productId`: the key is the only identity that survives a
 * client's offcut or a manual measurement (neither has a catalog product) and the only one that
 * tells two pools of the SAME board apart — one squared, one `skipTrim`, two physical sheets that
 * cannot be shared. Pieces of an order frozen before the key was stored fall into one nameless
 * group (`isUnnamed`).
 */
export const groupByMaterial = (pieces: OrderPiece[]): MaterialGroup[] => {
  const groups = new Map<string, MaterialGroup>()
  pieces.forEach((p) => {
    const key = p.materialKey ?? ''
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        name: p.productName ?? p.productCode ?? p.materialKey ?? 'Sin material',
        pieces: [],
        units: 0,
      }
      groups.set(key, group)
    }
    group.pieces.push(p)
    group.units += p.quantity ?? 0
  })
  return [...groups.values()]
}

// One group with no material of its own is an order the backfill never reached: a rubric reading
// "Sin material" over the whole list is a frame around nothing.
export const isUnnamed = (groups: MaterialGroup[]): boolean =>
  groups.length === 1 && groups[0]?.key === ''

export interface PieceEdges {
  // Every banded side, for the thumbnail.
  sides: CantoSides
  canto: CutListEdge | null
  specials: CutListEdge[]
}

/**
 * A piece's tapes, named. A canto especial takes its side from the auto banding, which keeps the
 * rest: the auto part is written over the sides left to it (the backend's `edge_notation`).
 *
 * The tape's NAME is not in the frozen `edges` (only its id), so `bandingNames` — built by the page
 * from the order's banding lines, which bill every tape it uses — supplies it, shortened the way
 * the review shortens it (no catalogue «TAPACANTO» prefix).
 */
export const pieceEdges = (
  edges: OrderPieceEdges | null | undefined,
  bandingNames?: Map<number, string>,
): PieceEdges => {
  const special = edges?.special_edges ?? []
  const taken = new Set<string>(special.map((e) => e.side))
  const autoSides = (edges?.sides ?? []).filter((s) => !taken.has(s))
  const nameOf = (id?: number | null) => bandingName({ productName: bandingNames?.get(id ?? -1) })
  return {
    sides: cantoSides({ sides: [...autoSides, ...special.map((e) => e.side)] }),
    canto:
      edges && autoSides.length > 0
        ? {
            notation: cantoNotation({ ...edges, sides: autoSides }),
            tape: nameOf(edges.product_id),
          }
        : null,
    specials: groupByTape(special, (e) => String(e.product_id)).map(({ sides, first }) => ({
      notation: specialEdgeNotation(sides, first.band_type, first.alias),
      tape: nameOf(first.product_id),
    })),
  }
}

// The cards' groups (`CutListCards`).
export const orderCutList = (
  pieces: OrderPiece[],
  bandingNames?: Map<number, string>,
): CutListGroup[] => {
  const groups = groupByMaterial(pieces)
  const unnamed = isUnnamed(groups)
  return groups.map((g) => ({
    key: g.key,
    name: unnamed ? null : g.name,
    units: g.units,
    pieces: g.pieces.map((p, i) => ({
      // `OrderPiece.id` is optional in the API contract; the index is stable, the list is frozen.
      key: p.id ?? `${g.key}-${i}`,
      label: p.label?.trim() ?? '',
      height: p.height ?? '—',
      width: p.width ?? '—',
      quantity: p.quantity ?? 0,
      ...pieceEdges(p.edges, bandingNames),
      codes: workshopCodesLine(p),
    })),
  }))
}
