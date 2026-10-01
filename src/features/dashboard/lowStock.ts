import type { LowStockItem } from './types'

// What the low-stock report can be narrowed by. Strings for the branch because they travel in the
// URL, where every value is one.
export interface LowStockFilterValues {
  branch: string[]
  type: LowStockItem['type'][]
  subtype: string[]
}

// The report is filtered in the client (see `LowStockPage`), so the same rule serves the page and
// the sheet's «Ver 8 productos»: code and name for the search, the same pair the catalog's search
// box matches on.
export const filterLowStock = (
  items: LowStockItem[],
  values: LowStockFilterValues,
  search: string,
): LowStockItem[] => {
  const term = search.trim().toLowerCase()
  return items.filter(
    (item) =>
      (values.branch.length === 0 || values.branch.includes(String(item.branch.id))) &&
      (values.type.length === 0 || values.type.includes(item.type)) &&
      (values.subtype.length === 0 ||
        (item.subtype !== null && values.subtype.includes(item.subtype))) &&
      (term === '' ||
        item.code.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term)),
  )
}
