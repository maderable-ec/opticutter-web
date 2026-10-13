import { httpClient } from 'src/shared/api/httpClient'
import type {
  CompanyPayload,
  CompanySettings,
  ConsumablePayload,
  ConsumableSettings,
  CuttingPayload,
  CuttingSettings,
  PreorderPayload,
  PreorderSettings,
  StockPayload,
  StockSettings,
  TaxPayload,
  TaxSettings,
} from './types'
import type { WorkSchedule } from './workSchedule'

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
  getTaxes: () => httpClient.get<TaxSettings>(`${BASE}/taxes`),
  getStock: () => httpClient.get<StockSettings>(`${BASE}/stock`),
  updateStock: (data: StockPayload) => httpClient.patch<StockSettings>(`${BASE}/stock`, data),
  updateTaxes: (data: TaxPayload) => httpClient.patch<TaxSettings>(`${BASE}/taxes`, data),
  getConsumables: () => httpClient.get<ConsumableSettings>(`${BASE}/consumables`),
  updateConsumables: (data: ConsumablePayload) =>
    httpClient.patch<ConsumableSettings>(`${BASE}/consumables`, data),
  // The shop's working hours. Replaced whole: the PATCH is one value, not seven.
  getWorkSchedule: () => httpClient.get<WorkSchedule>(`${BASE}/work-schedule`),
  updateWorkSchedule: (data: WorkSchedule) =>
    httpClient.patch<WorkSchedule>(`${BASE}/work-schedule`, data),
}
