import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { Role } from 'src/features/auth/types'
import { analyticsApi } from './analyticsApi'
import type { Granularity } from './types'

// The comparison is always every branch, which is what makes it one: the key leaves the branch
// filter out, so picking a branch on another tab does not refetch it.
export const useBranchComparison = (from?: string, to?: string) =>
  useQuery({
    queryKey: ['analytics', 'branch-comparison', { from, to }],
    queryFn: () => analyticsApi.branchComparison(from, to),
    placeholderData: keepPreviousData,
  })

export const useProduction = (from?: string, to?: string, branchId?: number) =>
  useQuery({
    queryKey: ['analytics', 'production', { from, to, branchId }],
    queryFn: () => analyticsApi.production(from, to, branchId),
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

// Productividad asks only for the role on screen: each tab of it is one report.
export const useSellers = (
  from: string,
  to: string,
  branchId: number | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: ['analytics', 'sellers', { from, to, branchId }],
    queryFn: () => analyticsApi.sellers(from, to, branchId),
    placeholderData: keepPreviousData,
    enabled,
  })

export const useOperators = (
  from: string,
  to: string,
  branchId: number | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: ['analytics', 'operators', { from, to, branchId }],
    queryFn: () => analyticsApi.operators(from, to, branchId),
    placeholderData: keepPreviousData,
    enabled,
  })

// What is behind one person's row: asked for only while its detail is open.
export const useSellerOrders = (
  userId: number | undefined,
  from: string,
  to: string,
  branchId: number | undefined,
) =>
  useQuery({
    queryKey: ['analytics', 'seller-orders', { userId, from, to, branchId }],
    queryFn: () => analyticsApi.sellerOrders(userId as number, from, to, branchId),
    enabled: userId != null,
  })

export const useOperatorBoards = (
  userId: number | undefined,
  from: string,
  to: string,
  branchId: number | undefined,
) =>
  useQuery({
    queryKey: ['analytics', 'operator-boards', { userId, from, to, branchId }],
    queryFn: () => analyticsApi.operatorBoards(userId as number, from, to, branchId),
    enabled: userId != null,
  })

export const useBanderOrders = (
  userId: number | undefined,
  from: string,
  to: string,
  branchId: number | undefined,
) =>
  useQuery({
    queryKey: ['analytics', 'bander-orders', { userId, from, to, branchId }],
    queryFn: () => analyticsApi.banderOrders(userId as number, from, to, branchId),
    enabled: userId != null,
  })

export const useBanders = (
  from: string,
  to: string,
  branchId: number | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: ['analytics', 'banders', { from, to, branchId }],
    queryFn: () => analyticsApi.banders(from, to, branchId),
    placeholderData: keepPreviousData,
    enabled,
  })

export const useAttendance = (from?: string, to?: string, branchId?: number, role?: Role) =>
  useQuery({
    queryKey: ['analytics', 'attendance', { from, to, branchId, role }],
    queryFn: () => analyticsApi.attendance(from, to, branchId, role),
    placeholderData: keepPreviousData,
  })
