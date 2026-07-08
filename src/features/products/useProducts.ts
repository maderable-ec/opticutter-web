import { createCrudHooks } from 'src/shared/hooks/createCrudHooks'
import { productsApi } from './productsApi'
import type { Product, ProductListParams, ProductPayload } from './types'

const hooks = createCrudHooks<Product, ProductListParams, ProductPayload, ProductPayload, string>(
  'products',
  productsApi,
)

export const useProducts = hooks.useList
export const useCreateProduct = hooks.useCreate
export const useUpdateProduct = hooks.useUpdate
export const useDeleteProduct = hooks.useDelete
