import { httpClient } from 'src/shared/api/httpClient'
import type {
  CompanyPayload,
  CompanySettings,
  CuttingPayload,
  CuttingSettings,
  PreorderPayload,
  PreorderSettings,
} from './types'

const BASE = '/api/v1/settings'

export const settingsApi = {
  getCutting: () => httpClient.get<CuttingSettings>(`${BASE}/cutting`),
  updateCutting: (data: CuttingPayload) =>
    httpClient.patch<CuttingSettings>(`${BASE}/cutting`, data),
  getCompany: () => httpClient.get<CompanySettings>(`${BASE}/company`),
  updateCompany: (data: CompanyPayload) =>
    httpClient.patch<CompanySettings>(`${BASE}/company`, data),
  getPreorders: () => httpClient.get<PreorderSettings>(`${BASE}/preorders`),
  updatePreorders: (data: PreorderPayload) =>
    httpClient.patch<PreorderSettings>(`${BASE}/preorders`, data),
}
