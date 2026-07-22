import { createCrudApi } from 'src/shared/api/crudApi'
import type {
  AdditionalService,
  AdditionalServiceListParams,
  AdditionalServicePayload,
} from './types'

export const servicesApi = createCrudApi<
  AdditionalService,
  AdditionalServiceListParams,
  AdditionalServicePayload,
  AdditionalServicePayload,
  string
>('/api/v1/additional-services')
