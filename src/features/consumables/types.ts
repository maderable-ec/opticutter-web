// The shop's consumables: what its machines wear out. One saw (blade + scoring blade) and one edge
// bander (glue) per branch, so a change belongs to a branch and nobody picks a machine.
export type ConsumableType = 'saw_blade' | 'scoring_blade' | 'glue'

// What went onto the saw: a blade out of the box, or one back from sharpening.
export type BladeCondition = 'new' | 'sharpened'

// Why a consumable came off EARLY. Each one offers its own three (`REASONS`).
export type ChangeReason = 'damaged' | 'poor_cut' | 'ran_out' | 'pot_cleaning' | 'other'

// What registering a change right now would meet. The thresholds are the API's alone: `blocked`
// within a minute of the last one, `early` under four working hours (it needs the reason).
export type ChangeGate = 'blocked' | 'early' | 'free'

export interface ConsumableChange {
  id: number
  branchId: number
  type: ConsumableType
  changedAt: string
  changedByLabel: string | null
  // Blades only.
  condition: BladeCondition | null
  // Glue only: the kg that went into the pot.
  quantity: number | null
  reason: ChangeReason | null
  note: string | null
}

// One consumable of a branch as it stands. The figures count from the last change: metres cut and
// boards processed for a blade, metres banded and bandings closed for the glue. All null until a
// first change is registered — there is nothing to count from.
export interface ConsumableStatus {
  type: ConsumableType
  gate: ChangeGate
  lastChange: ConsumableChange | null
  meters: number | null
  boards: number | null
  orders: number | null
  workedHours: number | null
  // Whether the viewer can take the last change back on their own (theirs, minutes old).
  canUndo: boolean
  // Glue only: the kg the control starts at (Configuración).
  standardQuantity: number | null
}

// The consumables of one branch the viewer may register: the API already narrows them by role.
export interface BranchConsumables {
  branchId: number
  branchName: string
  items: ConsumableStatus[]
}

export interface RegisterChangePayload {
  type: ConsumableType
  // The admin's to send; the shop floor registers on its own branch.
  branchId?: number
  condition?: BladeCondition
  quantity?: number
  reason?: ChangeReason
  note?: string
  // A change that happened before now: the admin's alone.
  changedAt?: string
}

// --- Report (GET /analytics/consumables) -------------------------------------------------------
// A LIFE is what one change put to work, up to the change that replaced it.
export interface ConsumableLife {
  // The change that opened it: the one to void if it was a mistake.
  changeId: number
  branchId: number
  branchName: string
  type: ConsumableType
  startedAt: string
  startedByLabel: string | null
  condition: BladeCondition | null
  quantity: number | null
  // Null while it is the one in use.
  endedAt: string | null
  endedByLabel: string | null
  endReason: ChangeReason | null
  endNote: string | null
  meters: number
  boards: number | null
  orders: number | null
  workedHours: number
  inUse: boolean
}

export interface ConditionYield {
  lives: number
  avgMeters: number | null
  avgBoards: number | null
}

// `changes` are the units that went IN during the range; the yield is read off the lives that
// CLOSED in it, leaving out the ones that came off damaged (`damagedLives`).
export interface ConsumableSummary {
  type: ConsumableType
  changes: number
  newCount: number | null
  sharpenedCount: number | null
  // Glue: the kg loaded in the range.
  quantity: number | null
  closedLives: number
  damagedLives: number
  avgMeters: number | null
  avgBoards: number | null
  new: ConditionYield | null
  sharpened: ConditionYield | null
  metersPerKg: number | null
  // The one on the machine today: a snapshot, not a figure of the range.
  current: ConsumableLife | null
}

export interface BranchConsumableReport {
  branchId: number
  branchName: string
  items: ConsumableSummary[]
}

export interface ConsumableReport {
  branches: BranchConsumableReport[]
  // Every life closed in the range plus the ones in use, newest first.
  lives: ConsumableLife[]
}
