import type { CutListGroup } from 'src/shared/components/CutListCards'
import type { BoardProduct, EdgeBandingProduct } from 'src/features/products/types'
import { specialEdgeNotation } from 'src/shared/utils/specialEdges'
import { stripBandingPrefix } from 'src/shared/utils/text'
import { workshopCodesLine } from 'src/shared/utils/workshopCodes'
import type { MaterialForm, RequirementForm } from './optimizerForm'
import {
  autoBandedSides,
  displayedBandType,
  isRequirementEmpty,
  materialLabel,
} from './optimizerForm'
import { specialEdgeTags } from './specialEdges'

// A quote's despiece, read the way an order's cut list is (`CutListCards`): the quote's «Piezas»
// on a phone, where the grid does not fit and a closed quote has no editor at all. The same words
// the order will print — so what the seller shows the client is what the shop will read.

const tapeName = (product?: EdgeBandingProduct): string | null =>
  product ? stripBandingPrefix(product.name) : null

export const requirementCutList = (
  requirements: RequirementForm[],
  materials: MaterialForm[],
  boards: BoardProduct[],
  byId: Map<string, EdgeBandingProduct>,
): CutListGroup[] => {
  const groups = new Map<string, CutListGroup>()
  requirements.forEach((r, flat) => {
    // A blank row is the editor's scratch line, not a piece.
    if (isRequirementEmpty(r)) return
    let group = groups.get(r.materialUid)
    if (!group) {
      const material = materials.find((m) => m.uid === r.materialUid)
      group = {
        key: r.materialUid,
        name: material ? materialLabel(material, boards) : 'Material sin definir',
        pieces: [],
        units: 0,
      }
      groups.set(r.materialUid, group)
    }
    const quantity = Number(r.quantity) || 0
    const special = r.specialEdges ?? []
    // The Canto column's sides that still carry its tape: a canto especial takes its side.
    const auto = autoBandedSides(r)
    const autoProduct = byId.get(String(r.edgeBanding.productId))
    group.units += quantity
    group.pieces.push({
      key: String(flat),
      label: r.label.trim(),
      height: r.height === '' ? '?' : r.height,
      width: r.width === '' ? '?' : r.width,
      quantity,
      sides: {
        top: auto.includes('top') || special.some((e) => e.side === 'top'),
        bottom: auto.includes('bottom') || special.some((e) => e.side === 'bottom'),
        left: auto.includes('left') || special.some((e) => e.side === 'left'),
        right: auto.includes('right') || special.some((e) => e.side === 'right'),
      },
      canto:
        auto.length > 0
          ? {
              notation: specialEdgeNotation(auto, displayedBandType(r.edgeBanding, byId)),
              tape: tapeName(autoProduct),
            }
          : null,
      specials: specialEdgeTags(special, byId).map((t) => ({
        notation: t.label,
        tape: tapeName(t.product),
      })),
      codes: workshopCodesLine(r),
    })
  })
  return [...groups.values()]
}
