import type { Product } from 'src/features/products/types'
import type { ListSort } from 'src/shared/components/FilterSortSection'

/** A design group: the boards and edge bandings that coordinate with each other.
 *
 *  It used to be a free-text `family` key inside each product's `attributes`
 *  bag, seeded from the vendor's inventory. It is a row of ours now, because
 *  the catalog sync rewrites that bag wholesale on every pass — anything typed
 *  here was wiped on the next sync.
 *
 *  The counts and the signals below are what used to be catalog-sync warnings.
 *  They moved with the data: judged from the vendor's rows they would flag
 *  designs already fixed by hand and stay quiet about the ones broken here. */
export interface ProductFamily {
  id: number
  name: string
  description?: string | null
  boardCount: number
  edgeBandingCount: number
  /** Only tapes: nothing coordinates with them. */
  hasNoBoards: boolean
  /** Only boards: their picker comes back empty, silently. */
  hasNoEdgeBandings: boolean
  /** Board thicknesses no stocked width covers — a 36mm board whose design only
   *  comes in 19mm tape. From the seller's chair, the same empty picker as a
   *  broken family. */
  uncoveredThicknesses: number[]
  /** Distinct codes the family's tapes print. More than one means the thermal
   *  label shows two codes for what the catalog calls one design. */
  aliases: string[]
  missingAliasCount: number
}

export interface ProductFamilyDetail extends ProductFamily {
  boards: Product[]
  edgeBandings: Product[]
}

export interface ProductFamilyListParams {
  search?: string
  sort?: ListSort
  /** Only families with something to fix. */
  issuesOnly?: boolean
  offset?: number
  limit?: number
}

export interface ProductFamilyPayload {
  name: string
  description?: string | null
}

/** Bulk (re)assignment. `familyId: null` unassigns — unassigning IS assigning to
 *  nothing, so it is one endpoint rather than two. */
export interface FamilyAssignPayload {
  familyId: number | null
  productIds: string[]
}

/** Stamps one printed code onto several of a family's tapes.
 *
 *  The alias belongs to the TAPE, not the design — but in practice every tape of
 *  one design prints the same code (72 families, zero divergent). So this serves
 *  the case that actually happens: a sync brings new widths of a known design
 *  and they arrive with no code. */
export interface FamilyAliasPayload {
  alias: string
  productIds: string[]
}

export interface FamilyAliasResult {
  updated: number
  alias: string
}

export interface FamilyAssignResult {
  assigned: number
  familyId: number | null
}

/** Whether a family has anything the catalog admin should look at. Mirrors the
 *  server's `issuesOnly` filter, and is what colours the row's badge. */
export const familyIssues = (family: ProductFamily): string[] => {
  const issues: string[] = []
  if (family.hasNoEdgeBandings) issues.push('Sin tapacanto')
  if (family.hasNoBoards) issues.push('Sin tablero')
  if (family.uncoveredThicknesses.length > 0) {
    issues.push(`Sin ancho para ${family.uncoveredThicknesses.join('/')}mm`)
  }
  if (family.aliases.length > 1) issues.push(`Alias distintos (${family.aliases.join(', ')})`)
  if (family.missingAliasCount > 0) issues.push(`${family.missingAliasCount} sin alias`)
  return issues
}
