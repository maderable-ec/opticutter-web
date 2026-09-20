import type { ListSort } from 'src/shared/components/FilterSortSection'

export type ProductType = 'board' | 'edge_banding'

export interface BoardAttributes {
  height?: number
  width?: number
  thickness?: number
  grainDirection?: string
  subtype?: string
}

export interface EdgeBandingAttributes {
  thickness?: number
  width?: number
  length?: number
  bandType?: string
  color?: string
  subtype?: string
}

/** The design group a product coordinates through.
 *
 *  `family` and `alias` used to be keys of `attributes`. They are columns of the
 *  product now, because the catalog sync replaces that bag wholesale on every
 *  pass: anything set from this dashboard was wiped on the next sync. What is
 *  left in `attributes` is the vendor's alone. */
export interface ProductFamilyRef {
  id: number
  name: string
}

interface ProductBase {
  id: string
  code: string
  externalCode?: string | null
  name: string
  description?: string | null
  // All three NET of tax, as the vendor's inventory publishes them. `price` is
  // level 1 (list); the other two are null when the source never loaded them, and
  // billing then falls back to level 1.
  price: number
  price2?: number | null
  price3?: number | null
  isActive: boolean
  // What you WRITE is `familyId`; `family` is what you read.
  familyId?: number | null
  family?: ProductFamilyRef | null
  // Edge banding only — the short code the workshop notation prints (`1L CS CSH`).
  // Independent of the family, which coordinates but is never printed.
  alias?: string | null
}

export interface BoardProduct extends ProductBase {
  type: 'board'
  attributes: BoardAttributes
}

export interface EdgeBandingProduct extends ProductBase {
  type: 'edge_banding'
  attributes: EdgeBandingAttributes
}

/** Discriminated union on `type` — narrow with `product.type === 'board'`. */
export type Product = BoardProduct | EdgeBandingProduct

export interface ProductListParams {
  // One or more types/subtypes; with multiple, `toQuery` sends repeated params
  // (?type=a&type=b), same convention as orders' `status`.
  type?: ProductType[]
  subtype?: string[]
  search?: string
  offset?: number
  limit?: number
  // Omit it to list active and inactive alike (what the catalog admin needs). Was `is_active`:
  // that was the only query param in the API still snake_case on the wire, while its own request
  // body already used `isActive`.
  isActive?: boolean
  sort?: ListSort
  familyId?: number
  // Two parameters rather than one nullable filter: a query string cannot carry
  // a null, so `?familyId=` would arrive as '' and 422 on its way to an int.
  unassigned?: boolean
}

export interface ProductPayload {
  code: string
  name: string
  description?: string | null
  type: ProductType
  price: number
  price2?: number | null
  price3?: number | null
  isActive?: boolean
  familyId?: number | null
  alias?: string | null
  attributes: BoardAttributes | EdgeBandingAttributes
}

/** A source row the sync couldn't import, identified the way the operator
 *  finds it in the inventory system: by code and article name. */
/** One source row the sync has something to report about — the vendor's own
 *  code and article name, because fixing it means finding that row in the
 *  inventory system. Same shape for both severities; which list it lands in
 *  (`issues` vs `warnings`) is what says how bad it is. */
export interface ProductSyncIssue {
  code: string
  name: string
  message: string
}

export interface ProductSyncResult {
  created: number
  updated: number
  deactivated: number
  deleted: number
  skippedMedio: number
  /** Articles the inventory system has taken out of service (est/FecEli). */
  skippedInactive: number
  /** Rows whose data couldn't be parsed. Skipped, never fatal — and left
   *  untouched in the catalog rather than treated as removed. */
  skippedInvalid: number
  /** Design groups the pass had to create because an incoming article named one
   *  the catalog didn't have. The sync seeds a family only when it CREATES a
   *  product; a family it invents is the one row it adds on our side. */
  familiesCreated: number
  issues: ProductSyncIssue[]
  /** Rows that WERE imported but that somebody should look at: a price level the
   *  vendor inverted, a tax rate that isn't the configured one, a board whose
   *  sides came in backwards — defects of the SOURCE, fixable only there. Plus
   *  the one coordination case left here: a NEW article that arrived with
   *  nothing to seed its family from, so it landed uncoordinated.
   *
   *  What moved out: "this family has no counterpart" and "no stocked width
   *  covers this board" are now computed over OUR rows, on the Familias screen —
   *  read from the vendor's `obs` they would flag designs already fixed here. */
  warnings: ProductSyncIssue[]
  /** True when the pass ran and rolled back: a preview, nothing was written. */
  dryRun: boolean
}
