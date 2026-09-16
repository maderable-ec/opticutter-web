import { useQuery } from '@tanstack/react-query'

import { inventoryApi } from './inventoryApi'
import type { StockCheckItem } from './types'

// Short but not zero: the answer comes from the vendor's warehouse, which the
// backend itself caches for a few minutes, so re-asking on every re-render of
// the quote step would buy nothing.
const STALE_TIME = 60_000

/**
 * Low-stock alerts for what a quote consumes in one branch.
 *
 * `items` goes in the query key by value: React Query hashes keys structurally,
 * so callers can build the array inline and a re-render with the same contents
 * refetches nothing.
 *
 * Disabled until there is a branch AND something to ask about: the branch is
 * picked in the last step of the wizard, and before that there is no warehouse
 * to consult. Never throws into the page — a failure just leaves `data`
 * undefined and the alert renders nothing.
 */
export const useStockCheck = (branchId: number | null, items: StockCheckItem[]) =>
  useQuery({
    queryKey: ['inventory', 'stockCheck', branchId, items],
    queryFn: () => inventoryApi.check({ branchId: branchId as number, items }),
    enabled: !!branchId && items.length > 0,
    staleTime: STALE_TIME,
    retry: false,
  })
