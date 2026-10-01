import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { Role } from 'src/features/auth/types'
import { analyticsApi } from './analyticsApi'
import type { Granularity } from './types'

export const useSummary = (from?: string, to?: string, branchId?: number) =>
  useQuery({
    queryKey: ['analytics', 'summary', { from, to, branchId }],
    queryFn: () => analyticsApi.summary(from, to, branchId),
    placeholderData: keepPreviousData,
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
    placeholderData: keepPreviousData,
  })

export const useStatusBreakdown = (from?: string, to?: string, branchId?: number) =>
  useQuery({
    queryKey: ['analytics', 'status-breakdown', { from, to, branchId }],
    queryFn: () => analyticsApi.statusBreakdown(from, to, branchId),
    placeholderData: keepPreviousData,
  })

// Per-branch comparison (#5). Always every branch: the API ignores a branch filter here, which is
// what makes it a comparison, so the key leaves it out and picking a branch does not refetch it.
export const useBranchBreakdown = (from?: string, to?: string) =>
  useQuery({
    queryKey: ['analytics', 'branch-breakdown', { from, to }],
    queryFn: () => analyticsApi.branchBreakdown(from, to),
    placeholderData: keepPreviousData,
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
    placeholderData: keepPreviousData,
  })

export const useUsersProductivity = (from?: string, to?: string, branchId?: number, role?: Role) =>
  useQuery({
    queryKey: ['analytics', 'users', { from, to, branchId, role }],
    queryFn: () => analyticsApi.users(from, to, branchId, role),
    placeholderData: keepPreviousData,
  })

export const useAttendance = (from?: string, to?: string, branchId?: number, role?: Role) =>
  useQuery({
    queryKey: ['analytics', 'attendance', { from, to, branchId, role }],
    queryFn: () => analyticsApi.attendance(from, to, branchId, role),
    placeholderData: keepPreviousData,
  })

// Low stock. Fetched whole and filtered in the page: the endpoint's `branchId`/
// `type` params would only trim the JSON (the backend builds the full cross
// product either way), while holding the list in memory buys instant filtering.
// Short stale time because the backend already caches the vendor read.
export const useLowStock = () =>
  useQuery({
    queryKey: ['analytics', 'lowStock'],
    queryFn: () => analyticsApi.lowStock(),
    staleTime: 60_000,
  })
