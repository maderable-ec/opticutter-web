import { describe, expect, it } from 'vitest'

import {
  changeTitle,
  changedToast,
  conditionLabel,
  earlyFact,
  fmtKg,
  justChangedLabel,
  mountLabel,
  REASONS,
  REASON_ICON,
  REASON_LABEL,
  sinceLine,
  stepGlue,
  usageLine,
  whenLabel,
} from './consumables'
import type { ConsumableChange, ConsumableStatus } from './types'

// Local time, wherever the suite runs: Tuesday 6 Oct 2026, 15:00.
const NOW = new Date(2026, 9, 6, 15, 0)
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute).toISOString()

const change = (overrides: Partial<ConsumableChange> = {}): ConsumableChange => ({
  id: 1,
  branchId: 1,
  type: 'saw_blade',
  changedAt: at(6, 10, 15),
  changedByLabel: 'Luis',
  condition: 'sharpened',
  quantity: null,
  reason: null,
  note: null,
  ...overrides,
})

const status = (overrides: Partial<ConsumableStatus> = {}): ConsumableStatus => ({
  type: 'saw_blade',
  gate: 'early',
  lastChange: change(),
  meters: 85,
  boards: 6,
  orders: null,
  workedHours: 4.75,
  canUndo: false,
  standardQuantity: null,
  ...overrides,
})

describe('the words of each consumable', () => {
  it('agree with it: the saw is feminine, the scoring blade masculine', () => {
    expect(mountLabel('saw_blade', 'new')).toBe('Puse una nueva')
    expect(mountLabel('saw_blade', 'sharpened')).toBe('Puse una afilada')
    expect(mountLabel('scoring_blade', 'new')).toBe('Puse uno nuevo')
    expect(mountLabel('scoring_blade', 'sharpened')).toBe('Puse uno afilado')
    expect(conditionLabel('scoring_blade', 'sharpened')).toBe('Afilado')
    expect(justChangedLabel('scoring_blade')).toBe('Cambiado hace un momento')
    expect(changedToast('saw_blade')).toBe('Sierra cambiada')
  })

  it('say the glue is loaded, not changed', () => {
    expect(changeTitle('glue')).toBe('Cargar goma')
    expect(changedToast('glue')).toBe('Goma cargada')
    expect(justChangedLabel('glue')).toBe('Cargada hace un momento')
    expect(changeTitle('saw_blade')).toBe('Cambiar sierra')
  })
})

describe('the reasons of an early change', () => {
  it('are three per consumable, each with its word and its drawing', () => {
    for (const reasons of Object.values(REASONS)) {
      expect(reasons).toHaveLength(3)
      for (const reason of reasons) {
        expect(REASON_LABEL[reason]).toBeTruthy()
        expect(REASON_ICON[reason]).toBeTruthy()
      }
    }
    // A blade does not run out and the glue does not cut.
    expect(REASONS.saw_blade).not.toContain('ran_out')
    expect(REASONS.glue).not.toContain('poor_cut')
  })

  it('are told apart by shape, not by word alone', () => {
    for (const reasons of Object.values(REASONS)) {
      expect(new Set(reasons.map((r) => REASON_ICON[r])).size).toBe(reasons.length)
    }
  })
})

describe('the glue load', () => {
  it('moves by half a kilo and never reaches zero', () => {
    expect(stepGlue(5, 1)).toBe(5.5)
    expect(stepGlue(5, -1)).toBe(4.5)
    expect(stepGlue(0.5, -1)).toBe(0.5)
    expect(stepGlue(50, 1)).toBe(50)
  })

  it('reads without a trailing zero', () => {
    expect(fmtKg(5)).toBe('5 kg')
    expect(fmtKg(3.5)).toBe('3,5 kg')
    expect(fmtKg(null)).toBe('—')
  })
})

describe('what a card says', () => {
  it('counts a blade in metres and boards, the glue in metres and bandings', () => {
    expect(usageLine(status({ meters: 1240.4, boards: 86 }))).toMatch(/^1\.240\sm · 86 tableros$/)
    expect(usageLine(status({ meters: 14, boards: 1 }))).toMatch(/^14\sm · 1 tablero$/)
    expect(usageLine(status({ meters: 20, boards: 1.5 }))).toMatch(/· 1,5 tableros$/)
    expect(usageLine(status({ type: 'glue', meters: 310, boards: null, orders: 4 }))).toMatch(
      /^310\sm · 4 órdenes canteadas$/,
    )
    expect(usageLine(status({ type: 'glue', meters: 80, orders: 1 }))).toMatch(
      /· 1 orden canteada$/,
    )
  })

  it('says when in the words of the day', () => {
    expect(whenLabel(at(6, 10, 15), NOW)).toBe('hoy 10:15')
    expect(whenLabel(at(5, 17, 30), NOW)).toBe('ayer 17:30')
    expect(whenLabel(at(1, 8, 12), NOW)).toMatch(/^jue[.,]? 01\/10 08:12$/)
  })

  it('names what is on the machine, since when and who put it', () => {
    expect(sinceLine(change(), NOW)).toBe('Afilada · hoy 10:15 · Luis')
    expect(sinceLine(change({ type: 'scoring_blade', condition: 'new' }), NOW)).toBe(
      'Nuevo · hoy 10:15 · Luis',
    )
    const load = change({ type: 'glue', condition: null, quantity: 4.5, changedByLabel: null })
    // Whoever loaded it is gone from the users: the line simply ends.
    expect(sinceLine(load, NOW)).toBe('4,5 kg · hoy 10:15')
  })

  it('puts the fact in front of an early change', () => {
    expect(earlyFact(status(), NOW)).toMatch(
      /^Esta sierra se puso hoy 10:15 y lleva 85\sm \(6 tableros\)\.$/,
    )
    expect(earlyFact(status({ type: 'scoring_blade', boards: 1 }), NOW)).toMatch(
      /^Este incisor se puso hoy 10:15 y lleva 85\sm \(1 tablero\)\.$/,
    )
    const glue = status({ type: 'glue', meters: 120, boards: null, orders: 2 })
    expect(earlyFact(glue, NOW)).toMatch(/^La goma se cargó hoy 10:15 y lleva 120\sm de canteo\.$/)
    expect(earlyFact(status({ lastChange: null }), NOW)).toBe('')
  })
})
