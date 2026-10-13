// What the shop floor reads and taps about its consumables, as plain functions: the words of each
// one (a blade is «cambiada», the glue is «cargada»), what its card says and what its buttons do.
// The rules themselves — when a change is held back or has to say why — are the API's: the card
// only reads the `gate` it sends.
import { fmtLocalTime, fmtWeekday } from 'src/features/analytics/format'
import type { Role } from 'src/features/auth/types'
import type { IconName } from 'src/shared/icons/registry'
import { localDateKey } from 'src/shared/utils/date'
import { fmtMeters, fmtNumber } from 'src/shared/utils/format'
import type {
  BladeCondition,
  ChangeReason,
  ConsumableChange,
  ConsumableStatus,
  ConsumableType,
} from './types'

// Who gets the «Insumos» entry at all. Which consumables each one registers is the API's to say
// (`CONSUMABLE_ROLES`): the status only brings the ones the viewer may touch.
export const CONSUMABLE_USER_ROLES: readonly Role[] = ['administrador', 'operador', 'canteador']

export const CONSUMABLE_LABEL: Record<ConsumableType, string> = {
  saw_blade: 'Sierra',
  scoring_blade: 'Incisor',
  glue: 'Goma',
}

export const CONSUMABLE_ICON: Record<ConsumableType, IconName> = {
  saw_blade: 'sawBlade',
  scoring_blade: 'scoringBlade',
  glue: 'glue',
}

export const isBlade = (type: ConsumableType): boolean => type !== 'glue'

// «Sierra» is feminine and «incisor» masculine: every word about them agrees.
const MASCULINE: Record<ConsumableType, boolean> = {
  saw_blade: false,
  scoring_blade: true,
  glue: false,
}
export const agree = (type: ConsumableType, feminine: string, masculine: string): string =>
  MASCULINE[type] ? masculine : feminine

/** «Nueva» / «Afilado»: what is on the saw. */
export const conditionLabel = (type: ConsumableType, condition: BladeCondition): string =>
  condition === 'new' ? agree(type, 'Nueva', 'Nuevo') : agree(type, 'Afilada', 'Afilado')

/** The button that registers a blade: the condition IS the button, so nothing else is asked. */
export const mountLabel = (type: ConsumableType, condition: BladeCondition): string =>
  condition === 'new'
    ? agree(type, 'Puse una nueva', 'Puse uno nuevo')
    : agree(type, 'Puse una afilada', 'Puse uno afilado')

/** The verb of the change, for a title: «Cambiar sierra», «Cargar goma». */
export const changeTitle = (type: ConsumableType): string =>
  `${isBlade(type) ? 'Cambiar' : 'Cargar'} ${CONSUMABLE_LABEL[type].toLowerCase()}`

/** Said once it is done: «Sierra cambiada», «Goma cargada». */
export const changedToast = (type: ConsumableType): string =>
  `${CONSUMABLE_LABEL[type]} ${isBlade(type) ? agree(type, 'cambiada', 'cambiado') : 'cargada'}`

/** Why the buttons are held back right after a change. */
export const justChangedLabel = (type: ConsumableType): string =>
  `${isBlade(type) ? agree(type, 'Cambiada', 'Cambiado') : 'Cargada'} hace un momento`

// --- Reasons of an early change ------------------------------------------------------------------
// In the order the question offers them; each consumable has its own three (the API's
// `REASONS_BY_TYPE`).
const BLADE_REASONS: ChangeReason[] = ['damaged', 'poor_cut', 'other']
export const REASONS: Record<ConsumableType, ChangeReason[]> = {
  saw_blade: BLADE_REASONS,
  scoring_blade: BLADE_REASONS,
  glue: ['ran_out', 'pot_cleaning', 'other'],
}

export const REASON_LABEL: Record<ChangeReason, string> = {
  damaged: 'Se dañó',
  poor_cut: 'No corta bien',
  ran_out: 'Se acabó',
  pot_cleaning: 'Limpieza de la olla',
  other: 'Otro motivo',
}

export const REASON_ICON: Record<ChangeReason, IconName> = {
  damaged: 'damaged',
  poor_cut: 'poorCut',
  ran_out: 'ranOut',
  pot_cleaning: 'cleaning',
  other: 'otherReason',
}

// --- The glue load -------------------------------------------------------------------------------
// The control moves by half a kilo and never reaches zero; 50 kg is the API's ceiling.
export const GLUE_STEP = 0.5
const GLUE_MIN = 0.5
const GLUE_MAX = 50

export const stepGlue = (kg: number, direction: 1 | -1): number =>
  Math.min(GLUE_MAX, Math.max(GLUE_MIN, Math.round((kg + direction * GLUE_STEP) * 2) / 2))

/** «5 kg», «3,5 kg». */
export const fmtKg = (kg: number | null | undefined): string =>
  kg != null ? `${fmtNumber(kg, 1, 0)} kg` : '—'

// --- What the card says ----------------------------------------------------------------------------
export const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many)

/** The work since the last change: «1.240 m · 86 tableros», «310 m · 4 órdenes canteadas». */
export const usageLine = (
  item: Pick<ConsumableStatus, 'type' | 'meters' | 'boards' | 'orders'>,
): string => {
  const meters = fmtMeters(item.meters ?? 0, 0)
  if (isBlade(item.type)) {
    const boards = item.boards ?? 0
    return `${meters} · ${fmtNumber(boards, 1, 0)} ${plural(boards, 'tablero', 'tableros')}`
  }
  const orders = item.orders ?? 0
  return `${meters} · ${fmtNumber(orders)} ${plural(orders, 'orden canteada', 'órdenes canteadas')}`
}

/** When something happened, the way the shop floor says it: «hoy 10:15», «ayer 17:30», «mar 06/10 08:12». */
export const whenLabel = (iso: string, now: Date = new Date()): string => {
  const day = localDateKey(new Date(iso))
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const time = fmtLocalTime(iso)
  if (day === localDateKey(now)) return `hoy ${time}`
  if (day === localDateKey(yesterday)) return `ayer ${time}`
  return `${fmtWeekday(day)} ${time}`
}

/** What is on the machine and since when: «Afilada · ayer 17:30 · Luis», «5 kg · hoy 09:40 · Ana». */
export const sinceLine = (change: ConsumableChange, now: Date = new Date()): string =>
  [
    change.condition ? conditionLabel(change.type, change.condition) : fmtKg(change.quantity),
    whenLabel(change.changedAt, now),
    change.changedByLabel,
  ]
    .filter(Boolean)
    .join(' · ')

/**
 * The fact an early change is asked against: «Esta sierra se puso hoy 10:15 y lleva 85 m
 * (6 tableros).» The metres are shown, not judged: they only move when a sheet is closed.
 */
export const earlyFact = (item: ConsumableStatus, now: Date = new Date()): string => {
  if (!item.lastChange) return ''
  const when = whenLabel(item.lastChange.changedAt, now)
  const meters = fmtMeters(item.meters ?? 0, 0)
  if (!isBlade(item.type)) return `La goma se cargó ${when} y lleva ${meters} de canteo.`
  const boards = item.boards ?? 0
  const count = `${fmtNumber(boards, 1, 0)} ${plural(boards, 'tablero', 'tableros')}`
  return `${agree(item.type, 'Esta', 'Este')} ${CONSUMABLE_LABEL[item.type].toLowerCase()} se puso ${when} y lleva ${meters} (${count}).`
}
