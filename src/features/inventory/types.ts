import type { BranchRef } from 'src/features/branches/types'

/** What a stock number is counted in. Not the same for the two product types. */
export type StockUnit = 'sheets' | 'linear_m'

/** One catalog product the quote consumes, with how much of it. */
export interface StockCheckItem {
  productId: number
  /** Sheets for a board, linear metres for edge banding. */
  quantity: number
}

export interface StockCheckPayload {
  branchId: number
  items: StockCheckItem[]
}

/** One product worth telling the seller about, with both reasons separately. */
export interface StockAlertItem {
  productId: number
  productCode: string | null
  productName: string | null
  type: 'board' | 'edge_banding'
  unit: StockUnit
  /** What the quote consumes. */
  required: number
  /** What the branch's warehouse holds. */
  available: number
  /** The configured floor for this product type. */
  threshold: number
  belowThreshold: boolean
  /** The branch holds less than the quote needs. */
  insufficient: boolean
}

/**
 * `checked: false` means the question could not be answered at all — the branch
 * has no warehouse configured, or the vendor's system did not respond. It is
 * NOT an error: the alert is information beside a quote and never blocks one.
 */
export interface StockCheckResult {
  branch: BranchRef | null
  checked: boolean
  alerts: StockAlertItem[]
}

// --- The low-stock report: not a metric over a window but a state right now, which is why it
// takes no date range and lives here, with inventory, rather than with the reports.
export interface LowStockItem {
  productId: number
  code: string
  name: string
  type: 'board' | 'edge_banding'
  /** Material subtype (MDP, Plywood, Canto Solido…). Null for a product whose
   *  attributes never carried one. */
  subtype: string | null
  /** 'sheets' for a board, 'linear_m' for edge banding. */
  unit: StockUnit
  branch: { id: number; code: string; name: string }
  available: number
  threshold: number
}

export interface LowStockReport {
  /** False when the vendor's inventory did not answer — NOT "all well stocked". */
  checked: boolean
  thresholds: { board: number; edgeBanding: number }
  items: LowStockItem[]
}
