import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { track } from 'src/shared/analytics'
import { WORKSHOP_CODES } from 'src/shared/utils/workshopCodes'
import type { LayoutAdjustment, MaterialInput, RequirementInput } from './types'

// The wizard's current step lives in a SEARCH PARAM, not a sub-route. `AppContent` keys its
// ErrorBoundary on `location.pathname`, so a path change would remount this page and destroy the
// whole workspace — pieces, undo history, the optimize result (a mutation, not a cached query) and
// fullscreen. A search param leaves `pathname` untouched, so back/forward walk the steps while the
// component stays mounted, and the route's `fluid` flag keeps matching `/preorders/new`.
//
// The param and its values are English like the rest of the code; only `label` is user-facing.

export const STEP_PARAM = 'step'

export const STEP_IDS = ['pieces', 'layout', 'costs', 'quote'] as const
export type StepId = (typeof STEP_IDS)[number]

// Optimización is the cut diagram itself: the sheet viewer that used to open as a fullscreen modal
// from Costos, now a step of its own because nearly every seller opened it. It is not the step of the
// same id that was folded into Costos in August (four geometry KPIs over a thumbnail rail): that one
// was crossed and never revisited, this one is the thing people came to look at. Old links carrying
// `?step=layout` therefore land where they always meant to.

export interface StepDef {
  id: StepId
  label: string
  // Shown on the disabled control when the step is not reachable yet.
  blockedReason: string
}

// Optimización and Costos are reached with pieces alone, not with a result: the optimize runs on
// ENTERING either of them, so gating them on a result would mean the run could never start.
export const STEPS: readonly StepDef[] = [
  { id: 'pieces', label: 'Despiece', blockedReason: '' },
  { id: 'layout', label: 'Optimización', blockedReason: 'Agrega al menos una pieza con medidas' },
  { id: 'costs', label: 'Costos', blockedReason: 'Agrega al menos una pieza con medidas' },
  {
    id: 'quote',
    label: 'Cotización',
    blockedReason: 'Falta elegir el tapacanto de algunas piezas',
  },
]

export interface WizardGates {
  // Any row carries data — enough to attempt a run.
  hasPieceData: boolean
  // A result is on screen. No longer part of the ladder (see `maxIndex`), only of the reason a
  // blocked step gives for being blocked.
  hasResult: boolean
  // A result plus every banded piece has its tapacanto product, and no piece left out of the plan.
  canQuote: boolean
  // Pieces the result on screen does NOT cut (sum of `unplaced[].quantity`). A quote may never go
  // out with one: pre-order 157 did, behind a warning nobody read, so this is a wall, not a notice.
  unplacedCount: number
}

// "Una pieza no entra" / "3 piezas no entran": the reason the Cotización step gives while the plan
// leaves pieces out. Exported so the Cotización step itself says the same words.
export const unplacedReason = (count: number): string =>
  `${count === 1 ? 'Una pieza no entra' : `${count} piezas no entran`} en el material`

// Signature of everything that determines a result. Compared against the signature of the payload
// actually sent, it tells whether what's on screen still describes the current inputs.
//
// The workshop codes are left out: they move no piece and no price (the API keeps them out of its
// hash too), so typing one must not turn the result stale and send the next step back through the
// search overlay. They still ride in the payload, which is what the quote and the order read.
const withoutWorkshopCodes = (r: RequirementInput): RequirementInput => {
  const geometry = { ...r }
  for (const { field } of WORKSHOP_CODES) delete geometry[field]
  return geometry
}

//
// The hand adjustments ARE in: they decide which sheets exist and where every piece sits.
export const signatureOf = (
  materials: MaterialInput[],
  requirements: RequirementInput[],
  variant: number,
  priceLevel: number,
  layoutAdjustments: LayoutAdjustment[] | null = null,
): string =>
  JSON.stringify({
    materials,
    requirements: requirements.map(withoutWorkshopCodes),
    variant,
    priceLevel,
    layoutAdjustments,
  })

export const useOptimizerWizard = ({
  hasPieceData,
  hasResult,
  canQuote,
  unplacedCount,
}: WizardGates) => {
  const [params, setParams] = useSearchParams()

  // Furthest step the current data allows. Backwards is always free; forwards is gated.
  const maxIndex = useMemo(() => {
    if (canQuote) return 3
    if (hasPieceData) return 2
    return 0
  }, [hasPieceData, canQuote])

  const raw = params.get(STEP_PARAM)
  const requested = raw == null ? 0 : STEP_IDS.indexOf(raw as StepId)
  const index = Math.min(Math.max(requested, 0), maxIndex)
  const step = STEP_IDS[index] ?? 'pieces'

  // Clamp the URL back to what the data allows: a refresh restores pieces from the autosave but
  // never the result, so `?step=quote` in a fresh tab has to fall back. `replace` so the bogus
  // entry doesn't end up in the history.
  useEffect(() => {
    if (raw != null && raw !== step) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set(STEP_PARAM, step)
          return next
        },
        { replace: true },
      )
    }
  }, [raw, step, setParams])

  // One event per step the seller lands on: the clamped one, so a refreshed `?step=quote` that falls
  // back to Despiece counts as Despiece. `index` only ever changes together with `step`.
  useEffect(() => {
    track('optimizer_step_viewed', { step, index })
  }, [step, index])

  // Why a step cannot be reached. Cotización has three different answers now that the run happens
  // on the way — "no hay resultado", "piezas que no entran" and "faltan tapacantos" — and its
  // static text only covers the last. Used by the trail's tooltip as well as the footer's hint, so
  // both agree.
  const blockedReasonFor = useCallback(
    (id: StepId): string => {
      if (id === 'quote' && !hasResult) return 'Primero hay que optimizar'
      if (id === 'quote' && unplacedCount > 0) return unplacedReason(unplacedCount)
      return STEPS[STEP_IDS.indexOf(id)]?.blockedReason ?? ''
    },
    [hasResult, unplacedCount],
  )

  const goTo = useCallback(
    (target: StepId) => {
      const i = STEP_IDS.indexOf(target)
      if (i < 0 || i > maxIndex) return
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set(STEP_PARAM, target)
        return next
      })
    },
    [maxIndex, setParams],
  )

  const back = useCallback(() => {
    const prev = STEP_IDS[index - 1]
    if (prev) goTo(prev)
  }, [index, goTo])

  const isLast = index === STEP_IDS.length - 1
  const canGoNext = !isLast && index + 1 <= maxIndex
  // Why "Siguiente" is disabled, taken from the step it would lead to.
  const nextStep = STEP_IDS[index + 1]
  const nextBlockedReason =
    isLast || canGoNext || !nextStep ? undefined : blockedReasonFor(nextStep)

  const next = useCallback(() => {
    const target = STEP_IDS[index + 1]
    if (target) goTo(target)
  }, [index, goTo])

  // The footer names where each button goes ("‹ Despiece", "Costos ›") instead of "Atrás" and
  // "Siguiente": the seller sees what comes next without looking up at the trail.
  const prevLabel = STEPS[index - 1]?.label
  const nextLabel = STEPS[index + 1]?.label

  return {
    step,
    index,
    maxIndex,
    goTo,
    back,
    next,
    canGoNext,
    blockedReasonFor,
    nextBlockedReason,
    isLast,
    prevLabel,
    nextLabel,
  }
}

export type OptimizerWizard = ReturnType<typeof useOptimizerWizard>
