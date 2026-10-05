import { useMemo } from 'react'
import type { Role } from 'src/features/auth/types'
import { useListParams } from 'src/shared/hooks/useListParams'
import {
  DEFAULT_GRANULARITY,
  DEFAULT_PRESET,
  GRANULARITIES,
  REPORT_PARAMS,
  ROLE_OPTIONS,
  resolvePeriod,
  withRangeEnd,
  type PeriodPreset,
} from './reportFilters'
import type { Granularity } from './types'

// The filters every report shares, in the URL (see `reportFilters.ts`). A default is written as
// nothing, so the bare path and «Restablecer» are the same view.
export const useReportFilters = () => {
  const { getParam, setParams, clearParams } = useListParams()
  const period = getParam('period')
  const rawFrom = getParam('from')
  const rawTo = getParam('to')
  // Resolved once per URL: `new Date()` inside would hand every render a fresh object.
  const resolved = useMemo(
    () => resolvePeriod({ period, from: rawFrom, to: rawTo }),
    [period, rawFrom, rawTo],
  )

  const rawBranch = Number(getParam('branchId'))
  const branchId = Number.isInteger(rawBranch) && rawBranch > 0 ? rawBranch : undefined
  const rawGranularity = getParam('granularity')
  const granularity = GRANULARITIES.find((g) => g.id === rawGranularity)?.id ?? DEFAULT_GRANULARITY
  const rawRole = getParam('role')
  const role = ROLE_OPTIONS.find((r) => r.value === rawRole)?.value

  return {
    ...resolved,
    branchId,
    granularity,
    role,
    setPreset: (next: PeriodPreset) =>
      setParams({
        period: next === DEFAULT_PRESET ? undefined : next,
        from: undefined,
        to: undefined,
      }),
    // `replace`: a date input reports every segment the user types, and each would be a step of
    // Back otherwise.
    setRangeEnd: (end: 'from' | 'to', day: string) => {
      if (!day) return
      const next = withRangeEnd(resolved, end, day)
      setParams({ period: undefined, ...next }, { replace: true })
    },
    setBranchId: (next: number | undefined) =>
      setParams({ branchId: next === undefined ? undefined : String(next) }),
    setGranularity: (next: Granularity) =>
      setParams({ granularity: next === DEFAULT_GRANULARITY ? undefined : next }),
    setRole: (next: Role | undefined) => setParams({ role: next }),
    reset: () => clearParams([...REPORT_PARAMS]),
  }
}

export type ReportFiltersState = ReturnType<typeof useReportFilters>
