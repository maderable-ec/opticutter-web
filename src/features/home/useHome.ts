import type { UseQueryResult } from '@tanstack/react-query'

import { useLowStock } from 'src/features/inventory/useLowStock'
import { useOrders, useOrdersTotal } from 'src/features/orders/useOrders'
import { usePreOrders, usePreOrdersTotal } from 'src/features/preorders/usePreOrders'
import {
  CHANGES_REQUESTED,
  IN_PROCESS,
  OPEN_OLDEST,
  QUEUED,
  STALEST,
  TO_DISPATCH,
  TO_QUEUE,
  countExpiringSoon,
  stockCounts,
  todayRange,
  todayFigures,
} from './home'
import type { AttentionKey, ProductionKey } from './home'

// The home screen's queries, one hook per block. Every count is an existing listing asked for one
// row (`use*Total`), so nothing here needs an endpoint of its own.

// The API's page cap. The quotes about to lapse are the oldest open ones, so a hundred of them is
// every quote that can expire this week in any shop this size.
const OPEN_QUOTES_SCANNED = 100

const settle = (queries: UseQueryResult[]) => ({
  failed: queries.some((q) => q.isError),
  error: queries.find((q) => q.isError)?.error,
  retry: () => queries.filter((q) => q.isError).forEach((q) => void q.refetch()),
})

export const useAttention = (branchId?: number) => {
  const changes = usePreOrdersTotal({ ...CHANGES_REQUESTED, branchId }, true)
  const open = usePreOrders({ ...OPEN_OLDEST, branchId, offset: 0, limit: OPEN_QUOTES_SCANNED })
  const toQueue = useOrdersTotal({ ...TO_QUEUE, branchId }, true)
  const toDispatch = useOrdersTotal({ ...TO_DISPATCH, branchId }, true)

  const counts: Record<AttentionKey, number | undefined> = {
    changesRequested: changes.data,
    expiringSoon: open.data ? countExpiringSoon(open.data.items) : undefined,
    toQueue: toQueue.data,
    toDispatch: toDispatch.data,
  }
  return { counts, ...settle([changes, open, toQueue, toDispatch]) }
}

export const useProduction = (branchId?: number) => {
  const queued = useOrdersTotal({ ...QUEUED, branchId }, true)
  const inProcess = useOrdersTotal({ ...IN_PROCESS, branchId }, true)
  const stalest = useOrders({ ...STALEST, branchId, offset: 0, limit: 3 })

  const counts: Record<ProductionKey, number | undefined> = {
    queued: queued.data,
    inProcess: inProcess.data,
  }
  return {
    counts,
    stalest: stalest.data?.items,
    ...settle([queued, inProcess, stalest]),
  }
}

// Admin only: mounted by the admin's blocks, so a seller never fires them.
export const useToday = (branchId?: number) => {
  const today = useOrders({ ...todayRange(), branchId, sort: 'recent', offset: 0, limit: 100 })
  return {
    figures: today.data ? todayFigures(today.data.items) : undefined,
    ...settle([today]),
  }
}

export const useStock = (branchId?: number) => {
  const report = useLowStock()
  return {
    // `checked: false` is the vendor's inventory not answering, NOT "all well stocked".
    counts: report.data?.checked ? stockCounts(report.data.items, branchId) : undefined,
    unchecked: report.data?.checked === false,
    ...settle([report]),
  }
}
