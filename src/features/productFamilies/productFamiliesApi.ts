import { createCrudApi } from 'src/shared/api/crudApi'
import { httpClient } from 'src/shared/api/httpClient'
import type {
  FamilyAliasPayload,
  FamilyAliasResult,
  FamilyAssignPayload,
  FamilyAssignResult,
  ProductFamily,
  ProductFamilyDetail,
  ProductFamilyListParams,
  ProductFamilyPayload,
} from './types'

const BASE = '/api/v1/product-families'

const crud = createCrudApi<
  ProductFamily,
  ProductFamilyListParams,
  ProductFamilyPayload,
  ProductFamilyPayload,
  number
>(BASE)

export const productFamiliesApi = {
  ...crud,
  get: (id: number) => httpClient.get<ProductFamilyDetail>(`${BASE}/${id}`),
  // One call for both directions, and a POST so it can never collide with
  // `/{familyId}` whatever the route order.
  assign: (payload: FamilyAssignPayload) =>
    httpClient.post<FamilyAssignResult>(`${BASE}/assignments`, payload),
  setAlias: (familyId: number, payload: FamilyAliasPayload) =>
    httpClient.post<FamilyAliasResult>(`${BASE}/${familyId}/alias`, payload),
}
