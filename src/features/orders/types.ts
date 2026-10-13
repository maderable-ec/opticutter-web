import type { Client } from 'src/features/clients/types'
import type { BranchRef } from 'src/features/branches/types'
import type { EdgeSide } from 'src/shared/utils/cutDrawing'
import type {
  AdditionalServiceInput,
  PlacedPieceEdges,
  Remainder,
} from 'src/features/optimizer/types'
import type { IconName } from 'src/shared/icons/registry'

export type OrderStatus =
  | 'confirmed'
  | 'queued'
  | 'in_process'
  | 'finished'
  | 'dispatched'
  | 'cancelled'
  // Legacy, read-only: the two statuses `in_process` absorbed. Nothing can reach them, but
  // the `history` of any order cut before the activities still says them, and the labels are
  // looked up by key — so they have to stay in the union and out of the filter options.
  | 'cutting'
  | 'cut'

// The parallel work of an order in process. `cutting` is on every order; `banding` only when
// it carries edge banding; `additional` only when it registers additional services. A MISSING
// entry means the activity does not apply — there is no `not_applicable` value.
export type ActivityType = 'cutting' | 'banding' | 'additional'

export type ActivityStatus = 'pending' | 'in_progress' | 'done'

// Why an activity in progress was stopped by something outside whoever does it. Each activity
// pauses only for what can stop IT, and the API says which (`OrderActivity.pauseReasons`): the saw
// runs out of boards, the canteador out of tape — or `waiting_for_pieces`, the station before not
// handing over more. That last one the API lifts by itself the moment a piece arrives.
export type PauseReason = 'no_boards' | 'no_edge_banding' | 'machine_failure' | 'waiting_for_pieces'

// One pause of an activity. `endedAt` null: the pause in force.
export interface ActivityPause {
  id: number
  reason: PauseReason
  note?: string | null
  startedAt: string
  startedByLabel?: string | null
  endedAt?: string | null
  endedByLabel?: string | null
}

export interface OrderActivity {
  type: ActivityType
  status: ActivityStatus
  // When the activity stopped being BLOCKED: the order reached the queue (cut) or the first
  // piece of its set was cut (banding, additional). Null while nobody could work yet — which
  // is the right answer, not missing data, so a pending clock never runs against somebody who
  // was not allowed to start.
  readyAt?: string | null
  startedAt?: string | null
  startedBy?: number | null
  startedByLabel?: string | null
  finishedAt?: string | null
  finishedBy?: number | null
  finishedByLabel?: string | null
  // Since when the activity is paused; null when it is not. The status stays `in_progress`
  // throughout: no piece can be marked and the activity cannot be finished until it is resumed,
  // and the stretch stays out of the worker's time.
  pausedAt?: string | null
  pauseReason?: PauseReason | null
  // Every pause registered, oldest first.
  pauses?: ActivityPause[]
  // The reasons THIS activity may pause for right now, in the order to offer them. Bounded by the
  // API against the pieces (no «Esperando piezas» once none is owed), so nothing here mirrors the
  // table. Filled where `progress` is; null on the order detail.
  pauseReasons?: PauseReason[] | null
  // Cut pieces out of THIS activity's set (every piece for cut/additional, only the banded
  // ones for banding): the gate signal, and how the card says what is missing. Filled by the
  // three shop-floor surfaces (board, cutting plan, activity result), null on the order
  // detail — those rows are serialized straight from the table.
  progress?: CutProgress | null
}

// Order attachment (anexo): PDF/PNG/JPEG uploaded against an order.
export interface Attachment {
  id: number
  filename: string
  contentType: string
  sizeBytes: number
  createdAt: string
  createdBy: number | null
}

// How money arrived AFTER the sale. Credit is not one: it is what is owed.
export type PaymentMethod = 'cash' | 'transfer'

// One payment received after the sale, against the order's credit (on dispatch or later).
// `voidedAt` set: registered by mistake, it no longer counts — the row stays as the record.
export interface OrderPayment {
  id: number
  method: PaymentMethod
  amount: number
  paidAt: string
  note?: string | null
  receivedBy?: number | null
  receivedByLabel?: string | null
  voidedAt?: string | null
  voidedByLabel?: string | null
  voidReason?: string | null
}

export interface OrderLine {
  id: string
  // Null when the material is outside the catalog (an offcut or a manual
  // measurement); such a line is identified by its code/name alone.
  productId?: number | null
  productCode: string
  productName: string
  quantity: number
  unitPriceSnapshot: number
  lineTotal: number
  avgEfficiency?: number
  totalAreaM2?: number
  halfBoard?: boolean
  // Linear meters incl. waste, and the discriminant of the two kinds of line:
  // the server documents it as "Null for boards", so a line that carries it is
  // edge banding and is billed by the metre rather than by the sheet.
  linearM?: number | null
}

export interface OrderHistoryEntry {
  id: string
  // `actor` is the TYPE of the entity that acted, not a free-form name.
  actor?: 'staff' | 'client' | 'system'
  actorUserId?: number | null
  actorLabel?: string | null // actor's display name frozen at the time of the action
  createdAt: string
  fromStatus?: OrderStatus
  toStatus: OrderStatus
  note?: string
}

// Edge banding frozen on a cut-list row: the NOMINAL sides plus the tape.
//
// Keys are snake_case and that is not a bug to fix here — the server passes the
// requirement's `edge_banding` through as a raw dict rather than through a
// `CamelModel`, so this is the shape on the wire. `review/format.ts`'s helpers
// already read both spellings (`bandTypeOf`), which is why they can be reused
// verbatim on these.
export interface OrderPieceEdges {
  sides?: string[]
  product_id?: number | null
  band_type?: string | null
  alias?: string | null
  // Cantos especiales, only on a piece that has one. They win over the keys above on their side:
  // `sides` is the Canto column as typed, so a side listed in both carries the special tape.
  special_edges?: OrderPieceSpecialEdge[]
}

export interface OrderPieceSpecialEdge {
  side: EdgeSide
  product_id: number
  band_type?: string | null
  alias?: string | null
}

// A cut-list piece on an order, as returned by the server.
export interface OrderPiece {
  id?: string
  // The material this piece is cut from, as the optimization keys it. It is the
  // identity that survives what `productId` cannot name: a client's offcut, a
  // manual measurement, and two pools of the SAME board (one squared, one not).
  // Null only on an order the backfill could not read.
  materialKey?: string | null
  productId?: number | null
  productCode?: string | null
  productName?: string | null
  label?: string
  height?: number
  width?: number
  quantity?: number
  priority?: number
  canRotate?: boolean
  edges?: OrderPieceEdges | null
  // Workshop codes (abisagrado / ranurado / ensamble / división); null = no such work.
  hingingCode?: string | null
  groovingCode?: string | null
  assemblyCode?: string | null
  divisionCode?: string | null
  [key: string]: unknown
}

export interface Order {
  id: string
  code: string
  status: OrderStatus
  subtotal?: number
  total: number
  priceLevel?: number
  priceLevelName?: string
  taxRate?: number
  taxAmount?: number
  // Frozen NET sum of the additional services (they are registered tax-included).
  additionalServicesTotal?: number
  // The lines behind that sum, frozen off the snapshot. `unitPrice` is the
  // tax-INCLUDED price the counter typed, while the total above is net — the
  // server does that conversion, and nothing here should redo it.
  additionalServices?: AdditionalServiceInput[]
  client: Client
  // Owning branch (mandatory FK): always present in list and detail responses.
  branch: BranchRef
  lines: OrderLine[]
  pieces?: OrderPiece[]
  history?: OrderHistoryEntry[]
  createdAt: string
  // The seller the order belongs to: who raised the quote. The name is null when that user is gone.
  createdBy?: number | null
  createdByName?: string | null
  confirmedAt?: string
  // When the order entered its CURRENT status: what the listing's "hace 3 h" counts from.
  // Not moved by prioritizing or reassigning the branch — neither is a status change.
  statusChangedAt?: string | null
  // When the order entered the production queue (payment registered); null while `confirmed`.
  queuedAt?: string | null
  // Commercial reference (project/site name) inherited from the quote and frozen here: read-only
  // on the order (there is no endpoint to edit it). Printed on every document as the "Ref:" line.
  notes?: string | null
  // The quote this order was born from — the mirror of the `orderId`/`orderCode` the pre-order
  // carries. The id is the route, the code is the label: without it the page would need a second
  // request just to name the link it is drawing. Null on an order created outside the review flow,
  // and resolved server-side to the OLDEST quote pointing here (two quotes with the same client,
  // branch, hash and totals dedupe into one order).
  preorderId?: number | null
  preorderCode?: string | null
  // Priority attention: sales' exception to the workshop's FIFO. Toggled with PATCH
  // /orders/:id/priority (orders:write, i.e. admin/vendedor) while the order is open; it moves the
  // order to the head of the shop-floor board and lights its card up. Nothing commercial.
  isPriority?: boolean
  externalInvoiceId?: string
  assignedToId?: number | null
  assignedAt?: string | null
  assignedToLabel?: string | null
  // The parallel work of `in_process`: one entry per APPLICABLE activity. `*Label` fields are
  // names frozen at the time of the action (same pattern as `assignedToLabel`).
  activities?: OrderActivity[]
  // Dispatch: fields frozen at the finished → dispatched transition.
  dispatchedAt?: string
  dispatchedBy?: number
  dispatchedByLabel?: string
  // Payment: fields frozen at the confirmed → queued transition. An order registered before
  // transferencia existed simply leaves that one null.
  paymentCashAmount?: number | null
  paymentTransferAmount?: number | null
  paymentCreditAmount?: number | null
  // What came in AFTER the sale against that credit, and what the client still owes: the credit
  // sold less the payments standing. The three amounts above never change — they are how the
  // order was sold. A cancelled order owes nothing.
  payments?: OrderPayment[]
  creditCollected?: number
  creditBalance?: number
}

export interface OrderListParams {
  // One or more statuses; with multiple the backend receives repeated `status` params (?status=a&status=b).
  status?: OrderStatus | OrderStatus[]
  // Effective filter for global roles (admin and vendedor); operador is implicitly scoped to their branch.
  branchId?: number
  clientId?: number
  // Order code or id, or the client's identifier / first / last name.
  search?: string
  // The moment the range and `actorId` read (see `orderEvents.ts`): when the order was created,
  // paid, finished... The backend defaults to `created`, and the event alone filters nothing.
  dateField?: OrderEvent
  // Inclusive bounds as `YYYY-MM-DD`, in the shop's local days (the backend cuts on Ecuador's
  // midnight, not UTC's).
  dateFrom?: string
  dateTo?: string
  // Only orders whose `dateField` was done by this user — the seller for `created`, who closed
  // the activity for a `*_done`. Works without dates.
  actorId?: number
  // The backend defaults to `oldest` (the workshop reads the listing FIFO); the list page asks for
  // `recent` because the back office wants the last order first.
  sort?: OrderSort
  // Only prioritized orders (true) or only regular ones (false); omit for both. Filters, never
  // reorders — floating them to the top is the shop-floor board's rule, not the back office's.
  isPriority?: boolean
  // One parallel activity and/or one stage of it ("everything still to band"). Either alone
  // works: the type on its own means "orders that carry this activity at all".
  activity?: ActivityType
  activityStatus?: ActivityStatus
  // Only orders with an activity paused right now (true) or with none (false). Reads `activity`
  // too: "every cut waiting on boards".
  paused?: boolean
  // Only orders the client still owes on (true) or the settled ones (false).
  hasBalance?: boolean
  offset?: number
  limit?: number
}

// The moments of an order's life the listing filters by. Each one is read where the backend writes
// it (`orders/order_events.py`): a column of the order, a history row that really moved the status,
// or an activity's close.
export type OrderEvent =
  | 'created'
  | 'paid'
  | 'in_process'
  | 'cut_done'
  | 'banding_done'
  | 'additional_done'
  | 'finished'
  | 'dispatched'
  | 'cancelled'

// `stalest` = longest sitting in its current status first, closed orders last. Unlike
// `isPriority` (which filters and never reorders), this one IS an ordering: "what has
// stopped moving" is a question nothing else can answer.
export type OrderSort = 'oldest' | 'recent' | 'stalest'

export interface UpdateStatusPayload {
  status: OrderStatus
  // Required when dispatching with a balance left: whose decision it was and when it gets paid.
  note?: string
  // `confirmed → queued`: how the order is paid for (required). `finished → dispatched`: what the
  // client pays of the credit on delivery — cash and/or transfer, never more than the balance.
  payment?: { cashAmount?: number; transferAmount?: number; creditAmount?: number }
  // Required by the server on `confirmed → queued`, unless the order already
  // carries one: entering the queue is where the sale is collected. Same field
  // as `POST /orders/{id}/invoice`, so sending one the order already has is a
  // no-op and sending a different one is a 409.
  externalInvoiceId?: string
}

// --- Change branch (rebalancing before the workshop starts cutting) ---
export interface ChangeBranchPayload {
  branchId: number
  note?: string
}

// --- Priority attention (sales' exception to the workshop's FIFO) ---
export interface SetPriorityPayload {
  isPriority: boolean
  // Why it was prioritized; lands in the order's history next to the status transitions.
  note?: string
}

// --- Payments after the sale ---
// POST /orders/{id}/payments: cash and/or transfer, at least one > 0, together within the balance.
export interface AddPaymentPayload {
  cashAmount?: number
  transferAmount?: number
  note?: string
}

// --- Activities (the shop floor's only write) ---
// PATCH body advances one activity forward-only (pending → in_progress → done).
export interface ActivityPayload {
  status: 'in_progress' | 'done'
  note?: string
}

// Response from PATCH /orders/{id}/activities/{type} (subset: no prices or pieces).
// `orderStatus` is the point: the order's status is DERIVED from the activities, so
// starting the cut moves it to `in_process` and closing the last one to `finished`
// without a second call — the card has to learn that from here.
export interface ActivityResult {
  orderId: number
  orderCode: string | null
  orderStatus: OrderStatus
  activity: OrderActivity
}

// POST /orders/{id}/activities/{type}/pause. Resuming takes no body.
export interface PauseActivityPayload {
  reason: PauseReason
  note?: string
}

export type BandType = 'Soft' | 'Hard'

// One MATERIAL of the order, not one billing line: a material billed as whole boards plus a
// half board is a single product to fetch from the rack, so the backend merges the two lines
// and reports the split here. `name` never carries the "(medio tablero)" suffix, and `count`
// is the sheets to fetch (`fullCount + halfCount` — a half counts as one physical sheet).
export interface BoardUsage {
  materialKey: string
  name: string
  count: number
  fullCount: number
  halfCount: number
}

export interface BandingUsage {
  name: string
  // Canonical, translated at the point of display: the workshop board paints it as a badge.
  bandType: BandType | null
  linearM: number
}

// An order in the shared workshop board (GET /orders/workshop-queue), used by operador,
// canteador, and administrador. `boardUsage` is one entry per material, in first-appearance
// order (the order the shop cuts in); practically never empty. `bandingUsage` is edge banding
// name + type + linear meters (billed: net + waste factor, server-side), also first-appearance
// order; empty when the order has no edge banding.
export interface WorkshopQueueItem {
  orderId: number
  orderCode: string | null
  status: Extract<OrderStatus, 'queued' | 'in_process'>
  notes?: string | null
  // Priority attention: the endpoint already lists these first (then FIFO). The card highlights it.
  isPriority: boolean
  createdAt: string
  // When the order actually entered the queue — i.e. when it was PAID, which is what gates
  // `confirmed → queued`. This, not `createdAt`, is the shop's arrival time: it is what the
  // endpoint's FIFO sorts by and what the card must measure the wait from.
  queuedAt?: string | null
  // When the order entered its current status. `queuedAt` freezes the moment somebody takes
  // the order, so the card needs this to keep counting through `in_process` — but for a
  // QUEUED card it must NOT be used: the admin rollback `in_process → queued` moves this one
  // and would reset the visible wait of an order that has been sitting all day.
  statusChangedAt?: string | null
  client: Client
  boardUsage: BoardUsage[]
  bandingUsage: BandingUsage[]
  progress: CutProgress
  /**
   * One entry per applicable activity, each with its own status, clocks and piece
   * progress — which is what drives this card's buttons and their blocked reasons.
   * The canteador cannot reach the cutting plan, so the per-activity counts have to
   * ride here. A missing type means the activity does not apply to the order.
   */
  activities: OrderActivity[]
  // Whether the order's branch prints the consolidated packet. Per item because the admin's
  // board spans every branch.
  printConsolidatedEnabled: boolean
}

// What a card's button does. `take` starts the cut AND opens the canvas (one gesture, because
// `Tomar` is tapped precisely when the cut is about to start); `open` only navigates; the rest
// start, finish, pause or resume the activity named in `activity`. There is no `complete`: the
// order finishes itself when the last activity closes.
export type BoardAction = 'take' | 'open' | 'start' | 'finish' | 'pause' | 'resume'

// One button on a queue card, derived per item from the viewer's roles and the order's
// activities. `nav` means the button navigates to the cutting canvas instead of confirming.
export interface CardAction {
  kind: BoardAction
  // Which activity the `start`/`finish` applies to (unused by `take`/`open`).
  activity?: ActivityType
  label: string
  color: 'primary' | 'success' | 'secondary'
  // Drawn as an outline: a way out of the work (pausing it), never the card's main move.
  outline?: boolean
  // Optional: the derivation lives in `activities.ts`, which is icon-free on purpose. The card
  // picks a default per `kind` when this is absent.
  icon?: IconName
  disabled?: boolean
  title?: string
  /**
   * Why the action is disabled, rendered as visible text under the buttons.
   * `title` is a hover tooltip and this board runs on a touch panel, where it
   * says nothing — a greyed-out button with no reason reads as a broken screen.
   */
  reason?: string
  nav?: boolean
}

export interface AssociateInvoicePayload {
  externalInvoiceId: string
  [key: string]: unknown
}

export interface ReviewLinkInfo {
  status: string
  url?: string
  token?: string
  createdAt?: string
  expiresAt?: string
  usedAt?: string
}

// --- Cutting plan (workshop view) ---
// Returned already expanded by physical board from GET /orders/{id}/cutting-plan; each piece carries
// its persistent `id` for marking and the same geometry as `placedPieces` in the optimizer.

export interface CutProgress {
  cutPieces: number
  totalPieces: number
}

// A physical piece within a board. Geometry is identical to PlacedPiece (optimizer); additionally
// carries the cut state. `id` (numeric) is the persistent identifier for PATCH; `pieceId`
// (`label#N`) is the human-readable instance identity.
export interface CutPiece {
  id: number
  pieceId: string
  label: string
  x: number
  y: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  rotated: boolean
  edges?: PlacedPieceEdges | null
  // Workshop codes of the cut-list row this piece comes from; null = no such work. What the
  // operator reads under the canto, and what the bander's "Adicionales" is counted on.
  hingingCode?: string | null
  groovingCode?: string | null
  assemblyCode?: string | null
  divisionCode?: string | null
  cut: boolean
  cutAt: string | null
  // Who marked the piece as cut.
  cutBy?: number | null
  cutByLabel?: string | null
}

// An actual saw (guillotine) cut path calculated by the optimizer: starts at (x, y) and runs
// `length` mm horizontally (isHorizontal: true, toward +x) or vertically (false, toward +y).
// Not inferred client-side: it would require kerf/trims/partition rules not included in the response.
export interface BoardCut {
  x: number
  y: number
  length: number
  isHorizontal: boolean
}

// A real physical board (one sheet). `sheetNumber` is sequential 1..N across the whole order;
// identical sheets appear twice (not deduplicated by pattern).
export interface CutBoard {
  id: number
  sheetNumber: number
  materialKey: string
  productCode: string
  productName: string
  width: number
  height: number
  thickness: number
  progress: CutProgress
  pieces: CutPiece[]
  halfBoard?: boolean
  // Leftover rectangles on the board (same shape as in the optimizer), to distinguish piece vs. waste.
  // Optional for backward compatibility with responses before the contract change.
  remainders?: Remainder[]
  // Full saw-path cuts end-to-end (primary aid against guillotine confusion in the workshop).
  cuts?: BoardCut[]
}

// The cut list's two files for the workshop's commercial cutting program (GET /pieces/export).
export type PiecesExportFormat = 'csv' | 'xml'

export interface CuttingPlan {
  orderId: number
  orderCode: string
  // Whose saw it is on: the branch a blade changed from the canvas is registered to.
  branchId: number
  status: OrderStatus
  // Whose job is on the saw: the reference alone does not say it.
  client: Client
  notes?: string | null
  progress: CutProgress
  // The order's activities: with `cutting` and `cut` merged into one status, this is what
  // tells the canvas whether the cut is still open (and lets it show the banding read-only).
  activities: OrderActivity[]
  boards: CutBoard[]
  // Whether the order's branch has a thermal printer: gates the label dispatch that follows
  // marking a piece cut.
  printLabelsEnabled: boolean
}

// Response from the mark PATCH: updated piece + recalculated progress (global and per board).
export interface MarkPieceResponse {
  piece: CutPiece
  progress: CutProgress
  boardProgress: CutProgress
}

// --- Live production state (GET /orders/production-status) -----------------------------------
// The saw is read off its events. `cutting`: a cutting event (a piece marked, a cut taken or
// closed) within `idleMinutes`; `stopped`: nothing for that long while there is work (an order
// queued or a cut in progress); `idle`: nothing, and nothing to do.
// `paused`: nothing within the gap, and the only cut open is registered as paused — a quiet saw
// with a reason, which says it instead of asking somebody to act.
export type ProductionState = 'cutting' | 'paused' | 'stopped' | 'idle'

// The banding and the additional work mark no pieces: they are read off their activities, as the
// shop registers them. `working`: one in progress; `waiting`: none in progress, some ready (a piece
// of theirs already cut); `idle`: neither.
// `paused`: none being worked, some registered as paused.
export type ActivityLiveState = 'working' | 'paused' | 'waiting' | 'idle'

export interface ActivityLiveStatus {
  state: ActivityLiveState
  // Working: the start of the oldest in progress. Paused: the oldest pause in force. Waiting: when
  // the oldest ready one became ready. Idle: the last close (null: never closed).
  since: string | null
  // Paused: why (the reason of the oldest pause in force) and which orders.
  pauseReason?: PauseReason | null
  pausedOrderCodes?: string[]
  orderCodes: string[]
  waitingCount: number
  lastFinishedAt: string | null
}

export interface BranchProductionStatus {
  branchId: number
  branchName: string
  state: ProductionState
  // When the current state began: the start of the run while cutting, the oldest pause in force
  // while paused, the last event otherwise (null: the branch never cut).
  since: string | null
  // Paused: why, and which orders' cut is paused (oldest pause first).
  pauseReason?: PauseReason | null
  pausedOrderCodes?: string[]
  lastEventAt: string | null
  queuedCount: number
  cuttingOrderCodes: string[]
  banding: ActivityLiveStatus
  additional: ActivityLiveStatus
}

export interface ProductionStatusReport {
  idleMinutes: number
  branches: BranchProductionStatus[]
}
