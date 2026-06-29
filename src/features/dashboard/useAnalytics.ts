import { useQuery } from '@tanstack/react-query'
import type { Role } from 'src/features/auth/types'
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

export const useBottlenecks = (
  from?: string,
  to?: string,
  branchId?: number,
  granularity?: Granularity,
) =>
  useQuery({
    queryKey: ['analytics', 'bottlenecks', { from, to, branchId, granularity }],
    queryFn: () => analyticsApi.bottlenecks(from, to, branchId, granularity),
  })

export const useUsersProductivity = (from?: string, to?: string, branchId?: number, role?: Role) =>
  useQuery({
    queryKey: ['analytics', 'users', { from, to, branchId, role }],
    queryFn: () => analyticsApi.users(from, to, branchId, role),
  })

export const useAttendance = (from?: string, to?: string, branchId?: number, role?: Role) =>
  useQuery({
    queryKey: ['analytics', 'attendance', { from, to, branchId, role }],
    queryFn: () => analyticsApi.attendance(from, to, branchId, role),
  })
