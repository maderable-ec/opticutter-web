import { describe, expect, it } from 'vitest'

import {
  consumedLine,
  currentLine,
  lifeEnd,
  lifeStart,
  lifeWhat,
  lifeWork,
  voidConsequence,
  yieldDetail,
  yieldLine,
} from './report'
import type { ConsumableLife, ConsumableSummary } from './types'

// Local time, wherever the suite runs: Tuesday 6 Oct 2026, 15:00.
const NOW = new Date(2026, 9, 6, 15, 0)
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute).toISOString()

const life = (overrides: Partial<ConsumableLife> = {}): ConsumableLife => ({
  changeId: 7,
  branchId: 1,
  branchName: 'Sucúa',
  type: 'saw_blade',
  startedAt: at(5, 17, 30),
  startedByLabel: 'Luis',
  condition: 'sharpened',
  quantity: null,
  endedAt: null,
  endedByLabel: null,
  endReason: null,
  endNote: null,
  meters: 620,
  boards: 41,
  orders: null,
  workedHours: 12.5,
  inUse: true,
  ...overrides,
})

const summary = (overrides: Partial<ConsumableSummary> = {}): ConsumableSummary => ({
  type: 'saw_blade',
  changes: 3,
  newCount: 1,
  sharpenedCount: 2,
  quantity: null,
  closedLives: 3,
  damagedLives: 0,
  avgMeters: 1200,
  avgBoards: 80,
  new: { lives: 1, avgMeters: 1400, avgBoards: 93 },
  sharpened: { lives: 2, avgMeters: 1100, avgBoards: 73.5 },
  metersPerKg: null,
  current: life(),
  ...overrides,
})

const glue = (overrides: Partial<ConsumableSummary> = {}): ConsumableSummary =>
  summary({
    type: 'glue',
    changes: 2,
    newCount: null,
    sharpenedCount: null,
    quantity: 9,
    avgBoards: null,
    new: null,
    sharpened: null,
    metersPerKg: 210.4,
    ...overrides,
  })

describe('what went in', () => {
  it('counts the blades by condition, agreeing with the blade', () => {
    expect(consumedLine(summary())).toBe('3 (1 nueva, 2 afiladas)')
    expect(consumedLine(summary({ type: 'scoring_blade', changes: 1, sharpenedCount: 0 }))).toBe(
      '1 (1 nuevo)',
    )
    expect(consumedLine(summary({ changes: 0, newCount: 0, sharpenedCount: 0 }))).toBe(
      'Sin cambios',
    )
  })

  it('counts the glue in kilos and loads', () => {
    expect(consumedLine(glue())).toBe('9 kg en 2 cargas')
    expect(consumedLine(glue({ changes: 1, quantity: 4.5 }))).toBe('4,5 kg en 1 carga')
    expect(consumedLine(glue({ changes: 0, quantity: 0 }))).toBe('Sin cargas')
  })
})

describe('what one gave', () => {
  it('reads a blade in metres and boards, and the glue in metres per kilo', () => {
    expect(yieldLine(summary())).toMatch(/^1\.200\sm · 80 tableros$/)
    expect(yieldLine(glue())).toMatch(/^210\sm por kg$/)
  })

  it('has nothing to say until one comes off', () => {
    expect(yieldLine(summary({ closedLives: 0, avgMeters: null, avgBoards: null }))).toBeNull()
    expect(yieldLine(glue({ metersPerKg: null }))).toBeNull()
  })

  it('sets new against sharpened only when the range has both', () => {
    expect(yieldDetail(summary())).toMatch(/^nueva 1\.400\sm · afilada 1\.100\sm$/)
    const onlyNew = summary({ sharpened: { lives: 0, avgMeters: null, avgBoards: null } })
    expect(yieldDetail(onlyNew)).toBeNull()
  })

  it('names the ones that broke, which the average leaves out', () => {
    expect(yieldDetail(summary({ damagedLives: 1, new: null, sharpened: null }))).toBe(
      '1 dañada aparte',
    )
    const scoring = summary({ type: 'scoring_blade', damagedLives: 2, new: null, sharpened: null })
    expect(yieldDetail(scoring)).toBe('2 dañados aparte')
  })
})

describe('a life', () => {
  it('says what went in, when and by whom', () => {
    expect(lifeWhat(life())).toBe('Afilada')
    expect(lifeWhat(life({ type: 'glue', condition: null, quantity: 5 }))).toBe('5 kg')
    expect(lifeStart(life(), NOW)).toBe('ayer 17:30 · Luis')
    expect(lifeStart(life({ startedByLabel: null }), NOW)).toBe('ayer 17:30')
  })

  it('says what it did', () => {
    expect(lifeWork(life())).toMatch(/^620\sm · 41 tableros$/)
    expect(lifeWork(life({ type: 'glue', meters: 310, boards: null, orders: 1 }))).toMatch(
      /^310\sm · 1 orden$/,
    )
  })

  it('says when it came off and, if early, why', () => {
    expect(lifeEnd(life(), NOW)).toBeNull()
    const worn = life({ endedAt: at(6, 10, 15), endedByLabel: 'Ana', inUse: false })
    expect(lifeEnd(worn, NOW)).toBe('hoy 10:15 · Ana')
    const broken = life({
      endedAt: at(6, 10, 15),
      endedByLabel: 'Ana',
      endReason: 'damaged',
      endNote: 'Diente roto',
      inUse: false,
    })
    expect(lifeEnd(broken, NOW)).toBe('hoy 10:15 · Ana · Se dañó: Diente roto')
  })

  it('reads the machine as it stands today', () => {
    expect(currentLine(life(), NOW)).toMatch(/^620\sm · 41 tableros · afilada desde ayer 17:30$/)
    expect(currentLine(null, NOW)).toBe('Sin registro')
  })

  it('says what voiding it does before the button is pressed', () => {
    expect(voidConsequence(life(), NOW)).toBe(
      'El cambio de sierra de ayer 17:30 deja de contar: lo que cortó pasa a la sierra anterior.',
    )
    expect(voidConsequence(life({ type: 'scoring_blade' }), NOW)).toContain('al incisor anterior')
    expect(voidConsequence(life({ type: 'glue' }), NOW)).toContain('La carga de goma de ayer 17:30')
  })
})
