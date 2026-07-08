import { createCrudHooks } from 'src/shared/hooks/createCrudHooks'
import { clientsApi } from './clientsApi'
import type { Client, ClientListParams, ClientPayload } from './types'

const hooks = createCrudHooks<Client, ClientListParams, ClientPayload, ClientPayload, string>(
  'clients',
  clientsApi,
)

export const useClients = hooks.useList
export const useCreateClient = hooks.useCreate
export const useUpdateClient = hooks.useUpdate
export const useDeleteClient = hooks.useDelete
