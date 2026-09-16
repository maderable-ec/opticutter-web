import type { FilterOption } from 'src/shared/components/FilterCheckboxList'

// Must match the backend's `BoardSubtype`/`EdgeBandingSubtype` enum values
// exactly (src/modules/products/types/board.py, types/edge_banding.py). Canonical
// values are English — what's sent/stored/filtered on — because the backend
// normalizes the vendor's Spanish text into these on sync (e.g. "Pino" ->
// "Pine"). The shop floor still thinks and talks in Spanish, so the UI shows
// SUBTYPE_LABELS' translation (the same terms this catalog used before the
// backend switched to English) instead of the raw value; only the wire value
// changed, not what a person reads.
export const BOARD_SUBTYPES = [
  'MDP',
  'MDF',
  'HDF',
  'Plywood',
  'Pine',
  'Natural Wood',
  'High Gloss',
  'Math Soft',
  'OSB',
  'Veneer',
  'Grooved',
] as const

export const EDGE_BANDING_SUBTYPES = ['Wood Grain', 'Solid', 'Gloss', 'Matte Soft', 'Wood'] as const

// English canonical value -> Spanish label shown to the user. Values with no
// entry here (MDP/MDF/HDF/OSB/Plywood/High Gloss/Math Soft) render as-is —
// they were never translated even before the backend's values were English.
export const SUBTYPE_LABELS: Record<string, string> = {
  Pine: 'Pino',
  'Natural Wood': 'Madera Natural',
  Veneer: 'Enchapado',
  Grooved: 'Ranurado',
  'Wood Grain': 'Canto Maderado',
  Solid: 'Canto Solido',
  Gloss: 'Canto Gloss',
  'Matte Soft': 'Canto Math Soft',
  Wood: 'Canto Madera',
}

export const subtypeLabel = (value: string): string => SUBTYPE_LABELS[value] ?? value

const BOARD_SUBTYPE_SET = new Set<string>(BOARD_SUBTYPES)
const EDGE_BANDING_SUBTYPE_SET = new Set<string>(EDGE_BANDING_SUBTYPES)

type ProductTypeValue = 'board' | 'edge_banding'

// Subtype choices scoped to the selected type(s): showing MDP/OSB while filtering by
// "Tapacanto" would only ever produce zero results. With no type selected both groups
// show (headed by group, since either can match); with exactly one type selected the
// header is dropped — the Tipo filter right above already says so.
//
// Lives here, beside the two lists, because two screens narrow by subtype the same
// way: the product catalog and the low-stock report.
export const subtypeOptionsFor = (types: ProductTypeValue[]): FilterOption[] => {
  const includeBoard = types.length === 0 || types.includes('board')
  const includeEdge = types.length === 0 || types.includes('edge_banding')
  const showGroups = includeBoard && includeEdge
  const options: FilterOption[] = []
  if (includeBoard) {
    options.push(
      ...BOARD_SUBTYPES.map((s) => ({
        value: s,
        label: subtypeLabel(s),
        group: showGroups ? 'Tablero' : undefined,
      })),
    )
  }
  if (includeEdge) {
    options.push(
      ...EDGE_BANDING_SUBTYPES.map((s) => ({
        value: s,
        label: subtypeLabel(s),
        group: showGroups ? 'Tapacanto' : undefined,
      })),
    )
  }
  return options
}

// Subtypes that survive narrowing the type set. Without this the two filters can
// combine into a guaranteed-empty result the user never asked for.
export const prunedSubtypes = (types: ProductTypeValue[], subtypes: string[]): string[] => {
  const includeBoard = types.length === 0 || types.includes('board')
  const includeEdge = types.length === 0 || types.includes('edge_banding')
  return subtypes.filter(
    (s) =>
      (includeBoard && BOARD_SUBTYPE_SET.has(s)) ||
      (includeEdge && EDGE_BANDING_SUBTYPE_SET.has(s)),
  )
}
