import type { EdgeBandingSummary, MaterialSummary } from 'src/features/optimizer/types'
import type { StockCheckItem } from './types'

/**
 * The catalog products a finished plan consumes, in the units the warehouse
 * counts: sheets for a board, billed linear metres for a tapacanto.
 *
 * Materials without a `productId` are skipped and that is the whole filter: a
 * client's offcut and a "medida manual" are not in the catalog, so the vendor
 * has no stock for them. A half board is a row of its own in the summary, so the
 * same board cut both ways is added up here rather than reported twice.
 */
export const stockItemsFromPlan = (
  materials: MaterialSummary[] | undefined,
  bandings: EdgeBandingSummary[] | undefined,
): StockCheckItem[] => {
  const byProduct = new Map<number, number>()
  const add = (productId: number | null | undefined, quantity: number) => {
    if (!productId || !(quantity > 0)) return
    byProduct.set(productId, (byProduct.get(productId) ?? 0) + quantity)
  }
  materials?.forEach((m) => add(m.productId, m.count))
  bandings?.forEach((b) => add(b.productId, b.billedLinearM))
  return [...byProduct].map(([productId, quantity]) => ({ productId, quantity }))
}

/**
 * The same list for an order, read off its billing lines.
 *
 * `order_lines` is the right source and not the frozen snapshot: it already has
 * one row per billed product with `quantity` in these very units, and its
 * `productId` is null for exactly the materials nobody stocks.
 */
export const stockItemsFromLines = (
  lines: { productId?: number | null; quantity: number }[] | undefined,
): StockCheckItem[] => {
  const byProduct = new Map<number, number>()
  lines?.forEach(({ productId, quantity }) => {
    if (!productId || !(quantity > 0)) return
    byProduct.set(productId, (byProduct.get(productId) ?? 0) + quantity)
  })
  return [...byProduct].map(([productId, quantity]) => ({ productId, quantity }))
}
