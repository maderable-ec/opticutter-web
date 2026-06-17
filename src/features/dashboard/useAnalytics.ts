import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from './analyticsApi'
import type { Granularity } from './types'

export const useSummary = (from?: string, to?: string, branchId?: number) =>
  useQuery({
    queryKey: ['analytics', 'summary', { from, to, branchId }],
    queryFn: () => analyticsApi.summary(from, to, branchId),
  })

export const useTimeseries = (
  from?: string,
  to?: string,
  granularity?: Granularity,
  branchId?: number,
) =>
  useQuery({
    queryKey: ['analytics', 'timeseries', { from, to, granularity, branchId }],
    queryFn: () => analyticsApi.timeseries(from, to, granularity, branchId),
  })

export const useStatusBreakdown = (from?: string, to?: string, branchId?: number) =>
  useQuery({
    queryKey: ['analytics', 'status-breakdown', { from, to, branchId }],
    queryFn: () => analyticsApi.statusBreakdown(from, to, branchId),
  })

export const useOperations = (from?: string, to?: string, branchId?: number) =>
  useQuery({
    queryKey: ['analytics', 'operations', { from, to, branchId }],
    queryFn: () => analyticsApi.operations(from, to, branchId),
  })

// Comparativo por sucursal (#5). El filtro `branchId` acota la comparación a una sola sucursal.
export const useBranchBreakdown = (from?: string, to?: string, branchId?: number) =>
  useQuery({
    queryKey: ['analytics', 'branch-breakdown', { from, to, branchId }],
    queryFn: () => analyticsApi.branchBreakdown(from, to, branchId),
  })
