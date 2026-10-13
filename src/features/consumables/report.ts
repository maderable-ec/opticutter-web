// What the consumables report (Estadísticas → Insumos) says about one consumable of one branch:
// how many went in, what each one gave, and what is on the machine. Plain strings, so the table
// and the phone's cards read the same.
import { fmtMeters, fmtNumber } from 'src/shared/utils/format'
import {
  agree,
  conditionLabel,
  CONSUMABLE_LABEL,
  fmtKg,
  isBlade,
  plural,
  REASON_LABEL,
  whenLabel,
} from './consumables'
import type {
  BladeCondition,
  ConditionYield,
  ConsumableLife,
  ConsumableSummary,
  ConsumableType,
} from './types'

const counted = (type: ConsumableType, n: number, condition: BladeCondition): string =>
  `${fmtNumber(n)} ${conditionLabel(type, condition).toLowerCase()}${n === 1 ? '' : 's'}`

/** The units that went in during the range: «3 (1 nueva, 2 afiladas)», «9 kg en 2 cargas». */
export const consumedLine = (s: ConsumableSummary): string => {
  if (!isBlade(s.type)) {
    if (s.changes === 0) return 'Sin cargas'
    return `${fmtKg(s.quantity)} en ${fmtNumber(s.changes)} ${plural(s.changes, 'carga', 'cargas')}`
  }
  if (s.changes === 0) return 'Sin cambios'
  const parts = [
    s.newCount ? counted(s.type, s.newCount, 'new') : null,
    s.sharpenedCount ? counted(s.type, s.sharpenedCount, 'sharpened') : null,
  ].filter(Boolean)
  return `${fmtNumber(s.changes)} (${parts.join(', ')})`
}

const boards = (n: number | null): string =>
  `${fmtNumber(n ?? 0, 1, 0)} ${plural(n ?? 0, 'tablero', 'tableros')}`

/**
 * What one gave, on average, over the lives closed in the range: «1.200 m · 80 tableros» for a
 * blade, «210 m por kg» for the glue. Null when none closed: there is nothing to average yet.
 */
export const yieldLine = (s: ConsumableSummary): string | null => {
  if (!isBlade(s.type)) {
    return s.metersPerKg != null ? `${fmtMeters(s.metersPerKg, 0)} por kg` : null
  }
  return s.avgMeters != null ? `${fmtMeters(s.avgMeters, 0)} · ${boards(s.avgBoards)}` : null
}

const conditionYield = (
  type: ConsumableType,
  condition: BladeCondition,
  y: ConditionYield | null,
): string | null =>
  y && y.avgMeters != null
    ? `${conditionLabel(type, condition).toLowerCase()} ${fmtMeters(y.avgMeters, 0)}`
    : null

/**
 * Under the yield: new against sharpened when the range has both, and the ones that broke, which
 * the average leaves out. «nueva 1.400 m · afilada 1.000 m · 1 dañada aparte».
 */
export const yieldDetail = (s: ConsumableSummary): string | null => {
  const parts: (string | null)[] = []
  if (s.new?.lives && s.sharpened?.lives) {
    parts.push(
      conditionYield(s.type, 'new', s.new),
      conditionYield(s.type, 'sharpened', s.sharpened),
    )
  }
  if (s.damagedLives > 0) {
    const word = agree(s.type, 'dañada', 'dañado') + (s.damagedLives === 1 ? '' : 's')
    parts.push(`${fmtNumber(s.damagedLives)} ${word} aparte`)
  }
  const said = parts.filter(Boolean)
  return said.length > 0 ? said.join(' · ') : null
}

/** What a life has done: «620 m · 41 tableros», «310 m · 4 órdenes». */
export const lifeWork = (life: ConsumableLife): string =>
  isBlade(life.type)
    ? `${fmtMeters(life.meters, 0)} · ${boards(life.boards)}`
    : `${fmtMeters(life.meters, 0)} · ${fmtNumber(life.orders ?? 0)} ${plural(life.orders ?? 0, 'orden', 'órdenes')}`

/** What went in: «Afilada», «Nuevo», «5 kg». */
export const lifeWhat = (life: ConsumableLife): string =>
  life.condition ? conditionLabel(life.type, life.condition) : fmtKg(life.quantity)

/** «mar 06/10 08:12 · Luis», or just when if whoever did it is gone. */
export const lifeStart = (life: ConsumableLife, now: Date = new Date()): string =>
  [whenLabel(life.startedAt, now), life.startedByLabel].filter(Boolean).join(' · ')

/** When it came off, who took it off and — if it came off early — why. Null while in use. */
export const lifeEnd = (life: ConsumableLife, now: Date = new Date()): string | null => {
  if (!life.endedAt) return null
  const reason = life.endReason
    ? [REASON_LABEL[life.endReason], life.endNote].filter(Boolean).join(': ')
    : null
  return [whenLabel(life.endedAt, now), life.endedByLabel, reason].filter(Boolean).join(' · ')
}

/** The machine as it stands today: «620 m · 41 tableros · afilada desde ayer 17:30». */
export const currentLine = (life: ConsumableLife | null, now: Date = new Date()): string => {
  if (!life) return 'Sin registro'
  return `${lifeWork(life)} · ${lifeWhat(life).toLowerCase()} desde ${whenLabel(life.startedAt, now)}`
}

/** What voiding a life's opening change does, said before the button. */
export const voidConsequence = (life: ConsumableLife, now: Date = new Date()): string => {
  const name = CONSUMABLE_LABEL[life.type].toLowerCase()
  const when = whenLabel(life.startedAt, now)
  return isBlade(life.type)
    ? `El cambio de ${name} de ${when} deja de contar: lo que cortó pasa ${agree(life.type, 'a la sierra anterior', 'al incisor anterior')}.`
    : `La carga de goma de ${when} deja de contar: lo que canteó pasa a la carga anterior.`
}
