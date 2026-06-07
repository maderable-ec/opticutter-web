import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from './analyticsApi'

export const useSummary = (from, to) =>
  useQuery({
    queryKey: ['analytics', 'summary', { from, to }],
    queryFn: () => analyticsApi.summary(from, to),
  })

export const useTimeseries = (from, to, granularity) =>
  useQuery({
    queryKey: ['analytics', 'timeseries', { from, to, granularity }],
    queryFn: () => analyticsApi.timeseries(from, to, granularity),
  })

export const useStatusBreakdown = (from, to) =>
  useQuery({
    queryKey: ['analytics', 'status-breakdown', { from, to }],
    queryFn: () => analyticsApi.statusBreakdown(from, to),
  })

export const useOperations = (from, to) =>
  useQuery({
    queryKey: ['analytics', 'operations', { from, to }],
    queryFn: () => analyticsApi.operations(from, to),
  })
