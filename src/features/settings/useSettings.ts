import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from './settingsApi'
import type {
  CompanyPayload,
  CompanySettings,
  CuttingPayload,
  CuttingSettings,
  PreorderPayload,
  PreorderSettings,
} from './types'

const CUTTING_KEY = ['settings', 'cutting']
const COMPANY_KEY = ['settings', 'company']
const PREORDER_KEY = ['settings', 'preorders']

export const useCuttingSettings = () =>
  useQuery({ queryKey: CUTTING_KEY, queryFn: settingsApi.getCutting })

export const useCompanySettings = () =>
  useQuery({ queryKey: COMPANY_KEY, queryFn: settingsApi.getCompany })

export const useUpdateCuttingSettings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CuttingPayload) => settingsApi.updateCutting(data),
    // The PATCH response is the server's source of truth; cache it directly.
    onSuccess: (data: CuttingSettings) => qc.setQueryData(CUTTING_KEY, data),
  })
}

export const useUpdateCompanySettings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CompanyPayload) => settingsApi.updateCompany(data),
    onSuccess: (data: CompanySettings) => qc.setQueryData(COMPANY_KEY, data),
  })
}

export const usePreorderSettings = () =>
  useQuery({ queryKey: PREORDER_KEY, queryFn: settingsApi.getPreorders })

export const useUpdatePreorderSettings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PreorderPayload) => settingsApi.updatePreorders(data),
    onSuccess: (data: PreorderSettings) => qc.setQueryData(PREORDER_KEY, data),
  })
}
