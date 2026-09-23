import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { optimizerApi } from '../optimizerApi'
import type {
  AdjustedSheet,
  CandidatePosition,
  EditablePool,
  LayoutAdjustment,
  LayoutEvaluateResponse,
  LeftoverExtension,
  OptimizePayload,
  Remainder,
  WholeOffcut,
  SheetBinInfo,
  SheetConversion,
  SheetFit,
} from '../types'

// State and server round trips of the layout editor.
//
// The editor owns ONE thing: the working adjustment, i.e. per pool the list of sheets and where each
// piece sits (`Pins`). Everything drawn — offcuts, efficiency, cost, what is pending — comes back
// from `/optimize/layout/evaluate` for that adjustment, and every position a piece may take comes
// from `/optimize/layout/candidates`. Nothing here decides what is valid: an edit is only kept once
// the server has evaluated it, so the plan on screen is always one the backend would accept.

// poolKey -> its working sheets. A pool absent from the map is the optimizer's plan, untouched.
export type Pins = Record<string, AdjustedSheet[]>

// A piece picked up and not yet dropped. `fromSheet` is null when it comes from the pending tray.
export interface Hand {
  pieceId: string
  rotated: boolean
  fromSheet: number | null
}

export interface LeftoverSelection {
  index: number
  rect: Remainder
  extensions: LeftoverExtension[] | null
}

const withoutLayout = (sheet: AdjustedSheet): AdjustedSheet => ({
  materialKey: sheet.materialKey,
  halfBoard: sheet.halfBoard,
  pieces: sheet.pieces.map((p) => ({ ...p })),
  wholeOffcuts: (sheet.wholeOffcuts ?? []).map((r) => ({ ...r })),
})

const pinsFrom = (adjustments: LayoutAdjustment[] | null | undefined): Pins => {
  const pins: Pins = {}
  for (const a of adjustments ?? []) pins[a.poolKey] = a.sheets.map(withoutLayout)
  return pins
}

const toAdjustments = (pins: Pins, dropEmpty: boolean): LayoutAdjustment[] =>
  Object.entries(pins).map(([poolKey, sheets]) => ({
    poolKey,
    sheets: dropEmpty ? sheets.filter((s) => s.pieces.length > 0) : sheets,
  }))

const errorMessage = (e: unknown): string =>
  e instanceof Error && e.message ? e.message : 'No se pudo evaluar la distribución.'

const sameRect = (a: WholeOffcut, b: WholeOffcut) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

// The sheet the editor opens on: the one the diagram was showing when "Ajustar" was pressed.
export interface EditorFocus {
  materialKey: string
  sheetNumber: number
}

interface Params {
  // The quote as it stands, WITHOUT adjustments: materials, cut list, level, variant.
  request: OptimizePayload
  initial: LayoutAdjustment[] | null | undefined
  focus?: EditorFocus | null
}

// Where a sheet of the diagram sits among the editor's pools and working sheets.
const locate = (pools: EditablePool[], focus: EditorFocus | null | undefined) => {
  if (!focus) return null
  for (const pool of pools) {
    const index = pool.sheets.findIndex(
      (s) =>
        s.layout?.material.materialKey === focus.materialKey &&
        s.layout?.material.sheetNumber === focus.sheetNumber,
    )
    if (index >= 0) return { poolKey: pool.poolKey, index }
  }
  return null
}

export const useLayoutEditor = ({ request, initial, focus }: Params) => {
  const [pins, setPins] = useState<Pins>(() => pinsFrom(initial))
  const [undoStack, setUndoStack] = useState<Pins[]>([])
  const [redoStack, setRedoStack] = useState<Pins[]>([])
  const [evaluation, setEvaluation] = useState<LayoutEvaluateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Something the seller should know that is not a failure (a whole offcut a piece now uses).
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [poolKey, setPoolKey] = useState<string | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [hand, setHand] = useState<Hand | null>(null)
  const [fits, setFits] = useState<SheetFit | null>(null)
  const [fitSummary, setFitSummary] = useState<SheetFit[] | null>(null)
  const [leftover, setLeftover] = useState<LeftoverSelection | null>(null)
  // Sizes the sheet on screen can take, fetched per sheet content (see below).
  const [conversionsFor, setConversionsFor] = useState<{
    key: string
    list: SheetConversion[]
  } | null>(null)

  // The latest pins for async continuations (kept in step by every `setPins` below), and a
  // counter that lets a stale probe response be dropped when the user has already moved on.
  const pinsRef = useRef(pins)
  const probeSeq = useRef(0)

  const payloadFor = useCallback(
    (next: Pins, dropEmpty = false): OptimizePayload => ({
      ...request,
      layoutAdjustments: Object.keys(next).length ? toAdjustments(next, dropEmpty) : null,
    }),
    [request],
  )

  const pools = useMemo(() => evaluation?.pools ?? [], [evaluation])
  const pool: EditablePool | undefined = pools.find((p) => p.poolKey === poolKey) ?? pools[0]
  const activePoolKey = pool?.poolKey ?? null

  // The sheets of a pool as the editor works on them: its pins, or the optimizer's own sheets.
  const sheetsOf = useCallback(
    (key: string): AdjustedSheet[] => {
      const pinned = pinsRef.current[key]
      if (pinned) return pinned
      const found = (evaluation?.pools ?? []).find((p) => p.poolKey === key)
      return (found?.sheets ?? []).map(withoutLayout)
    },
    [evaluation],
  )

  const sheets = useMemo(() => pool?.sheets ?? [], [pool])
  const sheet = sheets[Math.min(sheetIndex, Math.max(0, sheets.length - 1))]
  const binOf = useCallback(
    (s: AdjustedSheet | undefined): SheetBinInfo | undefined =>
      s && pool?.bins.find((b) => b.materialKey === s.materialKey && b.halfBoard === s.halfBoard),
    [pool],
  )

  // Evaluates an adjustment and, only once the server accepted it, makes it the working state.
  const commit = useCallback(
    async (next: Pins, { record = true }: { record?: boolean } = {}): Promise<boolean> => {
      setBusy(true)
      try {
        const res = await optimizerApi.evaluateLayout(payloadFor(next))
        if (record) {
          const previous = pinsRef.current
          setUndoStack((u) => [...u, previous])
          setRedoStack([])
        }
        pinsRef.current = next
        setPins(next)
        setEvaluation(res)
        setError(null)
        setNotice(null)
        return true
      } catch (e) {
        setError(errorMessage(e))
        return false
      } finally {
        setBusy(false)
      }
    },
    [payloadFor],
  )

  // First load: the stored adjustment if it still holds, the optimizer's plan otherwise.
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const start = pinsFrom(initial)
    const open = (res: LayoutEvaluateResponse) => {
      setEvaluation(res)
      const at = locate(res.pools, focus)
      if (at) {
        setPoolKey(at.poolKey)
        setSheetIndex(at.index)
      }
    }
    void (async () => {
      setBusy(true)
      try {
        open(await optimizerApi.evaluateLayout(payloadFor(start)))
      } catch (e) {
        if (!Object.keys(start).length) {
          setError(errorMessage(e))
          return
        }
        // A stored adjustment the current quote no longer admits: start from the plain plan and
        // say why, rather than opening an editor that cannot show anything.
        pinsRef.current = {}
        setPins({})
        setError(`Los ajustes guardados ya no se pueden aplicar (${errorMessage(e)}).`)
        try {
          open(await optimizerApi.evaluateLayout(payloadFor({})))
        } catch (e2) {
          setError(errorMessage(e2))
        }
      } finally {
        setBusy(false)
      }
    })()
  }, [initial, payloadFor, focus])

  const clearTransient = useCallback(() => {
    probeSeq.current += 1
    setHand(null)
    setFits(null)
    setFitSummary(null)
    setLeftover(null)
  }, [])

  // --- Probes ---

  const probePiece = useCallback(
    async (key: string, pieceId: string, index: number) => {
      const seq = ++probeSeq.current
      const base = { ...payloadFor({ ...pinsRef.current, [key]: sheetsOf(key) }) }
      try {
        const [detailed, summary] = await Promise.all([
          optimizerApi.layoutCandidates({
            ...base,
            probe: { kind: 'piece', poolKey: key, pieceId, sheetIndex: index },
          }),
          optimizerApi.layoutCandidates({
            ...base,
            probe: { kind: 'piece', poolKey: key, pieceId, sheetIndex: null },
          }),
        ])
        if (seq !== probeSeq.current) return
        setFits(detailed.sheets[0] ?? null)
        setFitSummary(summary.sheets)
      } catch (e) {
        if (seq === probeSeq.current) setError(errorMessage(e))
      }
    },
    [payloadFor, sheetsOf],
  )

  // The sheet menu's options follow the sheet on screen: re-asked whenever its content changes, and
  // derived (not reset) while the answer is on its way, so the menu says "Consultando…".
  const currentIndex = Math.min(sheetIndex, Math.max(0, sheets.length - 1))
  const conversionKey =
    activePoolKey && sheet && sheet.pieces.length > 0
      ? `${activePoolKey}:${currentIndex}:${JSON.stringify(withoutLayout(sheet))}`
      : null
  useEffect(() => {
    if (!conversionKey || !activePoolKey || conversionsFor?.key === conversionKey) return
    let alive = true
    optimizerApi
      .layoutCandidates({
        ...payloadFor({ ...pinsRef.current, [activePoolKey]: sheetsOf(activePoolKey) }),
        probe: { kind: 'sheet', poolKey: activePoolKey, sheetIndex: currentIndex },
      })
      .then((res) => {
        if (alive) setConversionsFor({ key: conversionKey, list: res.conversions })
      })
      .catch(() => {
        if (alive) setConversionsFor({ key: conversionKey, list: [] })
      })
    return () => {
      alive = false
    }
  }, [conversionKey, conversionsFor, activePoolKey, currentIndex, payloadFor, sheetsOf])
  const conversions: SheetConversion[] | null = !conversionKey
    ? []
    : conversionsFor?.key === conversionKey
      ? conversionsFor.list
      : null

  // --- Navigation ---

  const selectPool = useCallback(
    (key: string) => {
      clearTransient()
      setPoolKey(key)
      setSheetIndex(0)
    },
    [clearTransient],
  )

  const selectSheet = useCallback(
    (index: number) => {
      setSheetIndex(index)
      setLeftover(null)
      if (hand && activePoolKey) {
        setFits(null)
        void probePiece(activePoolKey, hand.pieceId, index)
      }
    },
    [hand, activePoolKey, probePiece],
  )

  // --- Pieces ---

  const pickUp = useCallback(
    (pieceId: string, fromSheet: number | null, rotated?: boolean) => {
      if (!activePoolKey) return
      const placed = fromSheet == null ? undefined : sheets[fromSheet]?.pieces
      const current = placed?.find((p) => p.pieceId === pieceId)
      setLeftover(null)
      setHand({ pieceId, fromSheet, rotated: rotated ?? current?.rotated ?? false })
      setFits(null)
      setFitSummary(null)
      void probePiece(activePoolKey, pieceId, Math.min(sheetIndex, sheets.length - 1))
    },
    [activePoolKey, sheets, sheetIndex, probePiece],
  )

  const rotateHand = useCallback(() => {
    setHand((h) => (h ? { ...h, rotated: !h.rotated } : h))
  }, [])

  const withPool = useCallback(
    (mutate: (sheets: AdjustedSheet[]) => AdjustedSheet[]): Pins | null => {
      if (!activePoolKey) return null
      return { ...pinsRef.current, [activePoolKey]: mutate(sheetsOf(activePoolKey)) }
    },
    [activePoolKey, sheetsOf],
  )

  // Puts one piece at a position of sheet `target`, taking it off wherever it was. A position on a
  // whole offcut uses that offcut, so the server names the whole offcuts it lands on and they stop
  // being kept whole.
  const commitPlacement = useCallback(
    async (pieceId: string, target: number, position: CandidatePosition) => {
      const used = new Set(position.usesWholeOffcuts ?? [])
      const next = withPool((list) =>
        list.map((s, i) => {
          const rest = s.pieces.filter((p) => p.pieceId !== pieceId)
          if (i !== target) return { ...s, pieces: rest }
          return {
            ...s,
            pieces: [...rest, { pieceId, x: position.x, y: position.y, rotated: position.rotated }],
            wholeOffcuts: s.wholeOffcuts.filter((_, k) => !used.has(k)),
          }
        }),
      )
      if (!next) return false
      clearTransient()
      const ok = await commit(next)
      if (ok && used.size > 0) {
        setNotice(
          used.size === 1
            ? 'Ubicaste la pieza sobre un retazo entero: ese retazo ya no sale completo.'
            : 'Ubicaste la pieza sobre retazos enteros: esos retazos ya no salen completos.',
        )
      }
      return ok
    },
    [withPool, clearTransient, commit],
  )

  // Drops the piece in hand on the sheet on screen. Back on its own spot is a cancel: nothing moved,
  // so nothing is sent and nothing lands in the history.
  const place = useCallback(
    async (position: CandidatePosition) => {
      if (!hand) return
      const target = Math.min(sheetIndex, sheets.length - 1)
      const where = sheets[target]?.pieces.find((p) => p.pieceId === hand.pieceId)
      if (
        where &&
        where.x === position.x &&
        where.y === position.y &&
        where.rotated === position.rotated
      ) {
        clearTransient()
        return
      }
      await commitPlacement(hand.pieceId, target, position)
    },
    [hand, sheetIndex, sheets, clearTransient, commitPlacement],
  )

  // «Girar» on a piece of the sheet on screen: turned in place when it fits there (one step, no
  // choosing), otherwise picked up already turned, with the spots where it does fit on show.
  // Returns whether it turned in place.
  const rotatePiece = useCallback(
    async (pieceId: string): Promise<boolean> => {
      if (!activePoolKey) return false
      const index = Math.min(sheetIndex, sheets.length - 1)
      const current = sheets[index]?.pieces.find((p) => p.pieceId === pieceId)
      if (!current) return false
      const seq = ++probeSeq.current
      setBusy(true)
      try {
        const base = payloadFor({ ...pinsRef.current, [activePoolKey]: sheetsOf(activePoolKey) })
        const [res, everywhere] = await Promise.all([
          optimizerApi.layoutCandidates({
            ...base,
            probe: { kind: 'piece', poolKey: activePoolKey, pieceId, sheetIndex: index },
          }),
          // Which OTHER sheets would take it turned, for when this one cannot.
          optimizerApi.layoutCandidates({
            ...base,
            probe: { kind: 'piece', poolKey: activePoolKey, pieceId, sheetIndex: null },
          }),
        ])
        if (seq !== probeSeq.current) return false
        const fit = res.sheets[0] ?? null
        const turned = !current.rotated
        const inPlace = fit?.positions.find(
          (p) => p.rotated === turned && p.x === current.x && p.y === current.y,
        )
        if (inPlace) return await commitPlacement(pieceId, index, inPlace)
        setLeftover(null)
        setHand({ pieceId, fromSheet: index, rotated: turned })
        setFits(fit)
        setFitSummary(everywhere.sheets)
        return false
      } catch (e) {
        setError(errorMessage(e))
        return false
      } finally {
        setBusy(false)
      }
    },
    [activePoolKey, sheetIndex, sheets, payloadFor, sheetsOf, commitPlacement],
  )

  const sendToPending = useCallback(
    async (pieceId: string) => {
      const next = withPool((list) =>
        list.map((s) => ({ ...s, pieces: s.pieces.filter((p) => p.pieceId !== pieceId) })),
      )
      if (!next) return
      clearTransient()
      await commit(next)
    },
    [withPool, clearTransient, commit],
  )

  // --- Sheets ---

  const addSheet = useCallback(
    async (bin: SheetBinInfo) => {
      const next = withPool((list) => [
        ...list,
        { materialKey: bin.materialKey, halfBoard: bin.halfBoard, pieces: [], wholeOffcuts: [] },
      ])
      if (!next || !activePoolKey) return
      const index = (next[activePoolKey] ?? []).length - 1
      if (await commit(next)) {
        setSheetIndex(index)
        if (hand) void probePiece(activePoolKey, hand.pieceId, index)
      }
    },
    [withPool, activePoolKey, commit, hand, probePiece],
  )

  const convertSheet = useCallback(
    async (conversion: SheetConversion) => {
      const target = Math.min(sheetIndex, sheets.length - 1)
      const next = withPool((list) =>
        list.map((s, i) =>
          i !== target
            ? s
            : {
                ...s,
                halfBoard: conversion.halfBoard,
                pieces: s.pieces.map((p) => ({
                  ...p,
                  x: p.x + conversion.shiftX,
                  y: p.y + conversion.shiftY,
                })),
                wholeOffcuts: s.wholeOffcuts.map((r) => ({
                  ...r,
                  x: r.x + conversion.shiftX,
                  y: r.y + conversion.shiftY,
                })),
              },
        ),
      )
      if (!next) return
      clearTransient()
      await commit(next)
    },
    [sheetIndex, sheets.length, withPool, clearTransient, commit],
  )

  // --- Offcuts ---

  const selectLeftover = useCallback(
    async (index: number, rect: Remainder) => {
      if (!activePoolKey) return
      const seq = ++probeSeq.current
      setHand(null)
      setFits(null)
      setFitSummary(null)
      setLeftover({ index, rect, extensions: null })
      try {
        const res = await optimizerApi.layoutCandidates({
          ...payloadFor({ ...pinsRef.current, [activePoolKey]: sheetsOf(activePoolKey) }),
          probe: {
            kind: 'leftover',
            poolKey: activePoolKey,
            sheetIndex: Math.min(sheetIndex, sheets.length - 1),
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
        })
        if (seq === probeSeq.current) setLeftover({ index, rect, extensions: res.extensions })
      } catch (e) {
        if (seq === probeSeq.current) setError(errorMessage(e))
      }
    },
    [activePoolKey, payloadFor, sheetsOf, sheetIndex, sheets.length],
  )

  // Makes `rect` a whole offcut, in place of the one it grew from when that one already was.
  const keepWhole = useCallback(
    async (rect: WholeOffcut, replacing?: WholeOffcut) => {
      const target = Math.min(sheetIndex, sheets.length - 1)
      const next = withPool((list) =>
        list.map((s, i) =>
          i !== target
            ? s
            : {
                ...s,
                wholeOffcuts: [
                  ...s.wholeOffcuts.filter((r) => !replacing || !sameRect(r, replacing)),
                  { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                ],
              },
        ),
      )
      if (!next) return
      clearTransient()
      await commit(next)
    },
    [sheetIndex, sheets.length, withPool, clearTransient, commit],
  )

  // The cuts may split this offcut again.
  const allowCutting = useCallback(
    async (rect: WholeOffcut) => {
      const target = Math.min(sheetIndex, sheets.length - 1)
      const next = withPool((list) =>
        list.map((s, i) =>
          i !== target
            ? s
            : { ...s, wholeOffcuts: s.wholeOffcuts.filter((r) => !sameRect(r, rect)) },
        ),
      )
      if (!next) return
      clearTransient()
      await commit(next)
    },
    [sheetIndex, sheets.length, withPool, clearTransient, commit],
  )

  // --- History ---

  const undo = useCallback(async () => {
    const previous = undoStack[undoStack.length - 1]
    if (!previous) return
    clearTransient()
    const current = pinsRef.current
    if (await commit(previous, { record: false })) {
      setUndoStack((u) => u.slice(0, -1))
      setRedoStack((r) => [...r, current])
    }
  }, [undoStack, clearTransient, commit])

  const redo = useCallback(async () => {
    const next = redoStack[redoStack.length - 1]
    if (!next) return
    clearTransient()
    const current = pinsRef.current
    if (await commit(next, { record: false })) {
      setRedoStack((r) => r.slice(0, -1))
      setUndoStack((u) => [...u, current])
    }
  }, [redoStack, clearTransient, commit])

  const restorePool = useCallback(async () => {
    if (!activePoolKey) return
    const next = { ...pinsRef.current }
    delete next[activePoolKey]
    clearTransient()
    setSheetIndex(0)
    await commit(next)
  }, [activePoolKey, clearTransient, commit])

  const restoreAll = useCallback(async () => {
    clearTransient()
    setSheetIndex(0)
    await commit({})
  }, [clearTransient, commit])

  // What "Aplicar" hands back: the pinned pools with their empty sheets dropped, or null when
  // nothing is adjusted any more.
  const result = useCallback((): LayoutAdjustment[] | null => {
    const list = toAdjustments(pinsRef.current, true)
    return list.length ? list : null
  }, [])

  // Why "Aplicar" is not available, if it is not.
  const blockedReason = useMemo(() => {
    if (busy) return 'Evaluando…'
    const stuck = pools.filter((p) => !p.finite && p.pending.length > 0)
    if (stuck.length) {
      const n = stuck.reduce((acc, p) => acc + p.pending.length, 0)
      return `Ubica ${n === 1 ? 'la pieza pendiente' : `las ${n} piezas pendientes`} antes de aplicar.`
    }
    return null
  }, [busy, pools])

  return {
    evaluation,
    pools,
    pool,
    sheets,
    sheet,
    sheetIndex: Math.min(sheetIndex, Math.max(0, sheets.length - 1)),
    binOf,
    pins,
    hand,
    fits,
    fitSummary,
    leftover,
    conversions,
    error,
    dismissError: () => setError(null),
    notice,
    dismissNotice: () => setNotice(null),
    busy,
    dirty: undoStack.length > 0,
    canUndo: undoStack.length > 0 && !busy,
    canRedo: redoStack.length > 0 && !busy,
    blockedReason,
    selectPool,
    selectSheet,
    pickUp,
    rotateHand,
    cancel: clearTransient,
    place,
    rotatePiece,
    sendToPending,
    addSheet,
    convertSheet,
    selectLeftover,
    keepWhole,
    allowCutting,
    undo,
    redo,
    restorePool,
    restoreAll,
    result,
  }
}

export type LayoutEditorState = ReturnType<typeof useLayoutEditor>
