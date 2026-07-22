export interface AdditionalService {
  id: string
  name: string
  price: number
  isActive: boolean
}

export interface AdditionalServicePayload {
  name: string
  price: number
  isActive: boolean
}

export interface AdditionalServiceListParams {
  search?: string
  isActive?: boolean
  offset?: number
  limit?: number
}
