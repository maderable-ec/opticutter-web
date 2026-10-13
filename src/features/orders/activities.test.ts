import { describe, expect, it } from 'vitest'

import {
  activityActions,
  activityBadge,
  isPaused,
  pauseReasonLabel,
  pauseReasonNote,
  pauseReasonsOf,
} from './activities'
import type { OrderActivity } from './types'

const PAUSED_AT = '2026-10-12T15:42:00Z'

const cut = (overrides: Partial<OrderActivity> = {}): OrderActivity => ({
  type: 'cutting',
  status: 'in_progress',
  progress: { cutPieces: 4, totalPieces: 10 },
  ...overrides,
})

describe('the buttons of an activity', () => {
  it('offer to start what is pending, blocked until one of its pieces is cut', () => {
    const [start] = activityActions({ type: 'banding', status: 'pending', progress: null })
    expect(start).toMatchObject({ kind: 'start', label: 'Iniciar canteado', disabled: true })
    expect(start?.reason).toBe('Falta cortar la primera pieza con canto')
    // The cut is its own floor.
    expect(activityActions(cut({ status: 'pending' }))[0]?.disabled).toBe(false)
  })

  it('offer to finish and, beside it, the way out: pausing', () => {
    const [finish, pause] = activityActions(cut())
    expect(finish).toMatchObject({ kind: 'finish', label: 'Terminar corte', disabled: true })
    expect(finish?.reason).toBe('Faltan 6 pieza(s) por cortar')
    // The pause is never blocked and never the main move: an outline beside «Terminar».
    expect(pause).toMatchObject({ kind: 'pause', label: 'Pausar corte', outline: true })
    expect(pause?.disabled).toBeUndefined()
  })

  it('offer only to resume what is paused', () => {
    const actions = activityActions(cut({ pausedAt: PAUSED_AT, pauseReason: 'no_boards' }))
    // No «Terminar» and no «Pausar»: the API takes neither until the pause is lifted.
    expect(actions).toEqual([
      { kind: 'resume', activity: 'cutting', label: 'Reanudar corte', color: 'primary' },
    ])
  })

  it('offer nothing once it is done', () => {
    expect(activityActions(cut({ status: 'done' }))).toEqual([])
  })
})

describe('a paused activity', () => {
  it('is work under way with a pause on it, never a status of its own', () => {
    expect(isPaused(cut({ pausedAt: PAUSED_AT }))).toBe(true)
    expect(isPaused(cut())).toBe(false)
    // A pause left on a row that moved on (the rollback to the queue) is not a pause.
    expect(isPaused(cut({ status: 'pending', pausedAt: PAUSED_AT }))).toBe(false)
    expect(isPaused(undefined)).toBe(false)
  })

  it('is drawn with its own shape and says why in words', () => {
    const paused = activityBadge(cut({ pausedAt: PAUSED_AT, pauseReason: 'machine_failure' }))
    const running = activityBadge(cut())
    expect(paused.icon).toBe('paused')
    expect(paused.icon).not.toBe(running.icon)
    expect(paused.label).toBe('Corte')
    expect(paused.statusWord).toBe('en pausa: daño de máquina')
  })

  it('names its reason, and a reason this build does not know', () => {
    expect(pauseReasonLabel('no_boards')).toBe('Sin tableros')
    expect(pauseReasonLabel('no_edge_banding')).toBe('Sin canto')
    expect(pauseReasonLabel('waiting_for_pieces')).toBe('Esperando piezas')
    expect(pauseReasonLabel(null)).toBe('En pausa')
    expect(pauseReasonLabel('strike' as never)).toBe('En pausa')
  })
})

describe('the reasons an activity may pause for', () => {
  it('are the ones the API says, in its order', () => {
    // Order 232: every banded piece cut, so neither boards nor waiting is on offer.
    const banding: OrderActivity = {
      type: 'banding',
      status: 'in_progress',
      pauseReasons: ['no_edge_banding', 'machine_failure'],
    }
    expect(pauseReasonsOf(banding)).toEqual(['no_edge_banding', 'machine_failure'])
  })

  it('fall back to the old three against an API that does not say yet', () => {
    const legacy = ['no_boards', 'no_edge_banding', 'machine_failure']
    expect(pauseReasonsOf(cut())).toEqual(legacy)
    expect(pauseReasonsOf(cut({ pauseReasons: null }))).toEqual(legacy)
    expect(pauseReasonsOf(undefined)).toEqual(legacy)
  })

  it('promise the office only when the office is told', () => {
    expect(pauseReasonNote('no_boards')).toContain('la oficina recibe el aviso')
    expect(pauseReasonNote(null)).toContain('la oficina recibe el aviso')
    const waiting = pauseReasonNote('waiting_for_pieces')
    expect(waiting).not.toContain('oficina')
    expect(waiting).toContain('Se reanuda sola')
  })
})
