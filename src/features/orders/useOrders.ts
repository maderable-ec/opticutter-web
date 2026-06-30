import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from 'src/shared/api/types'
import { clientsApiMin, ordersApi } from './ordersApi'
import type {
  OrderListParams,
  UpdateStatusPayload,
  AssociateInvoicePayload,
  BandingPayload,
  CuttingPlan,
  MarkPieceResponse,
} from './types'

export const useOrders = (params?: OrderListParams) =>
  useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.list(params),
  })

export const useOrder = (id?: string) =>
  useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.get(id as string),
    enabled: !!id,
  })

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStatusPayload }) =>
      ordersApi.updateStatus(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['orders', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export const useAssociateInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssociateInvoicePayload }) =>
      ordersApi.associateInvoice(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['orders', id] })
    },
  })
}

// --- Banding ---

const BANDING_QUEUE_KEY = ['orders', 'banding-queue'] as const

export const useBandingQueue = () =>
  useQuery({
    queryKey: BANDING_QUEUE_KEY,
    queryFn: () => ordersApi.getBandingQueue(),
  })

// Advances the banding track and refreshes the queue + the order detail/list.
// When moving to `done` the order leaves the queue on the next refetch.
export const useUpdateBanding = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BandingPayload }) =>
      ordersApi.patchBanding(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: BANDING_QUEUE_KEY })
      qc.invalidateQueries({ queryKey: ['orders', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export const useClientsMin = (search?: string) =>
  useQuery({
    queryKey: ['clients-min', search],
    queryFn: () => clientsApiMin.list(search),
  })

const cuttingPlanKey = (id: string) => ['orders', id, 'cutting-plan']

// Optimistic flip for a single piece: updates its board counters and the plan total only if the
// state actually changed (idempotent against double-taps or re-marking).
const applyCut = (plan: CuttingPlan, pieceId: number, cut: boolean): CuttingPlan => {
  let changed = false
  const boards = plan.boards.map((board) => {
    const idx = board.pieces.findIndex((p) => p.id === pieceId)
    if (idx === -1) return board
    const piece = board.pieces[idx]
    if (piece.cut === cut) return board
    changed = true
    const pieces = board.pieces.slice()
    pieces[idx] = { ...piece, cut }
    const delta = cut ? 1 : -1
    return {
      ...board,
      pieces,
      progress: { ...board.progress, cutPieces: board.progress.cutPieces + delta },
    }
  })
  if (!changed) return plan
  const delta = cut ? 1 : -1
  return {
    ...plan,
    boards,
    progress: { ...plan.progress, cutPieces: plan.progress.cutPieces + delta },
  }
}

// Reconciles the cache with the PATCH response (progress/boardProgress already recalculated by the API).
const reconcile = (plan: CuttingPlan, res: MarkPieceResponse): CuttingPlan => ({
  ...plan,
  progress: res.progress,
  boards: plan.boards.map((board) => {
    const idx = board.pieces.findIndex((p) => p.id === res.piece.id)
    if (idx === -1) return board
    const pieces = board.pieces.slice()
    pieces[idx] = res.piece
    return { ...board, pieces, progress: res.boardProgress }
  }),
})

export const useCuttingPlan = (id?: string, enabled = true) =>
  useQuery({
    queryKey: ['orders', id, 'cutting-plan'],
    queryFn: () => ordersApi.getCuttingPlan(id as string),
    enabled: !!id && enabled,
  })

export const useMarkPiece = (orderId: string) => {
  const qc = useQueryClient()
  const key = cuttingPlanKey(orderId)
  return useMutation({
    mutationFn: ({ pieceId, cut }: { pieceId: number; cut: boolean }) =>
      ordersApi.markPiece(orderId, pieceId, cut),
    onMutate: async ({ pieceId, cut }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<CuttingPlan>(key)
      if (prev) qc.setQueryData<CuttingPlan>(key, applyCut(prev, pieceId, cut))
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
      // 404: local plan is stale (e.g. order was recreated) → invalidate and refetch from server.
      if (err instanceof ApiError && err.status === 404) qc.invalidateQueries({ queryKey: key })
    },
    onSuccess: (res) => {
      // Multi-operator (last write wins): sync with the real counters from the API response.
      qc.setQueryData<CuttingPlan>(key, (cur) => (cur ? reconcile(cur, res) : cur))
    },
  })
}
