import { httpClient } from 'src/shared/api/httpClient'
import type { LowStockReport, StockCheckPayload, StockCheckResult } from './types'

export const inventoryApi = {
  // A POST and not a GET because the question carries the quantities the quote
  // needs: a product can be over its threshold and still not cover this cut list.
  check: (data: StockCheckPayload) =>
    httpClient.post<StockCheckResult>('/api/v1/inventory/stock-check', data),
  // The report the admin reorders from: every product under its threshold, per branch.
  lowStock: () => httpClient.get<LowStockReport>('/api/v1/inventory/low-stock'),
}
