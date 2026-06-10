import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from './analyticsApi'
import type { Granularity } from './types'

export const useSummary = (from?: string, to?: string) =>
  useQuery({
    queryKey: ['analytics', 'summary', { from, to }],
    queryFn: () => analyticsApi.summary(from, to),
  })

export const useTimeseries = (from?: string, to?: string, granularity?: Granularity) =>
  useQuery({
    queryKey: ['analytics', 'timeseries', { from, to, granularity }],
    queryFn: () => analyticsApi.timeseries(from, to, granularity),
  })

export const useStatusBreakdown = (from?: string, to?: string) =>
  useQuery({
    queryKey: ['analytics', 'status-breakdown', { from, to }],
    queryFn: () => analyticsApi.statusBreakdown(from, to),
  })

export const useOperations = (from?: string, to?: string) =>
  useQuery({
    queryKey: ['analytics', 'operations', { from, to }],
    queryFn: () => analyticsApi.operations(from, to),
  })
