import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { REFERENCE_STALE_TIME } from 'src/shared/constants'
import { priceTiersApi } from './priceTiersApi'
import type { PriceTier, PriceTiersPayload } from './types'

const PRICE_TIERS_KEY = ['settings', 'price-tiers']

export const usePriceTiers = () =>
  useQuery({
    queryKey: PRICE_TIERS_KEY,
    queryFn: priceTiersApi.getAll,
    staleTime: REFERENCE_STALE_TIME,
  })

export const useUpdatePriceTiers = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PriceTiersPayload) => priceTiersApi.update(data),
    onSuccess: (data: PriceTier[]) => qc.setQueryData(PRICE_TIERS_KEY, data),
  })
}
