import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCrudHooks } from 'src/shared/hooks/createCrudHooks'
import { REFERENCE_STALE_TIME } from 'src/shared/constants'
import { productFamiliesApi } from './productFamiliesApi'
import type {
  FamilyAliasPayload,
  FamilyAssignPayload,
  ProductFamily,
  ProductFamilyListParams,
  ProductFamilyPayload,
} from './types'

const KEY = 'product-families'

const hooks = createCrudHooks<
  ProductFamily,
  ProductFamilyListParams,
  ProductFamilyPayload,
  ProductFamilyPayload,
  number
>(KEY, productFamiliesApi)

export const useProductFamilies = hooks.useList
export const useCreateProductFamily = hooks.useCreate
export const useUpdateProductFamily = hooks.useUpdate
export const useDeleteProductFamily = hooks.useDelete

export const useProductFamily = (id: number | null) =>
  useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => productFamiliesApi.get(id as number),
    enabled: id !== null,
  })

/** Every family, for the picker in the product form. Same shape as
 *  `useActiveBranches`: a reference list, cached, small enough to fetch whole
 *  (75 designs on the live catalog). */
export const useAllProductFamilies = () =>
  useQuery({
    queryKey: [KEY, 'all'],
    queryFn: () => productFamiliesApi.list({ limit: 100, sort: 'name' }),
    select: (res): ProductFamily[] => res.items,
    staleTime: REFERENCE_STALE_TIME,
  })

/** Stamps a printed code onto the family's tapes.
 *
 *  Invalidates the same two families as the assignment does: the alias shows on
 *  the product listing, and the family's `missingAliasCount` badge is what sent
 *  the operator here in the first place. */
export const useSetFamilyAlias = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ familyId, ...payload }: FamilyAliasPayload & { familyId: number }) =>
      productFamiliesApi.setAlias(familyId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [KEY] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/** Invalidates BOTH families and products: an assignment changes what each
 *  product reports as its family, and the products listing paints it. */
export const useAssignFamily = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: FamilyAssignPayload) => productFamiliesApi.assign(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [KEY] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
