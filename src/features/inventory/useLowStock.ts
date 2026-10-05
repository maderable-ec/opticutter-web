import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from './inventoryApi'

// Low stock. Fetched whole and filtered in the page: the endpoint's `branchId`/
// `type` params would only trim the JSON (the backend builds the full cross
// product either way), while holding the list in memory buys instant filtering.
// Short stale time because the backend already caches the vendor read.
export const useLowStock = () =>
  useQuery({
    queryKey: ['inventory', 'lowStock'],
    queryFn: () => inventoryApi.lowStock(),
    staleTime: 60_000,
  })
