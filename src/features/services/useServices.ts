import { createCrudHooks } from 'src/shared/hooks/createCrudHooks'
import { servicesApi } from './servicesApi'
import type {
  AdditionalService,
  AdditionalServiceListParams,
  AdditionalServicePayload,
} from './types'

const hooks = createCrudHooks<
  AdditionalService,
  AdditionalServiceListParams,
  AdditionalServicePayload,
  AdditionalServicePayload,
  string
>('services', servicesApi)

export const useServices = hooks.useList
export const useCreateService = hooks.useCreate
export const useUpdateService = hooks.useUpdate
export const useDeleteService = hooks.useDelete
