import { createCrudApi } from 'src/shared/api/crudApi'
import type { Client, ClientListParams, ClientPayload } from './types'

export const clientsApi = createCrudApi<
  Client,
  ClientListParams,
  ClientPayload,
  ClientPayload,
  string
>('/api/v1/clients')
