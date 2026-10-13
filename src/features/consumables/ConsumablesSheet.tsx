import { useId, useState } from 'react'
import { CButton, CFormLabel, CFormTextarea } from '@coreui/react'
import { ApiError } from 'src/shared/api/types'
import BottomSheet from 'src/shared/components/BottomSheet'
import EmptyState from 'src/shared/components/EmptyState'
import LoadingBlock from 'src/shared/components/LoadingBlock'
import { ErrorState } from 'src/shared/components/QueryState'
import Spinner from 'src/shared/components/Spinner'
import Icon from 'src/shared/icons/Icon'
import { track } from 'src/shared/analytics'
import { useToastStore } from 'src/shared/store/toastStore'
import ConsumableCard from './ConsumableCard'
import type { ChangeIntent } from './ConsumableCard'
import {
  changeTitle,
  changedToast,
  earlyFact,
  isBlade,
  REASONS,
  REASON_ICON,
  REASON_LABEL,
} from './consumables'
import type { ChangeReason, ConsumableStatus, ConsumableType } from './types'
import { useConsumablesStatus, useRegisterChange, useVoidChange } from './useConsumables'

interface ConsumablesSheetProps {
  visible: boolean
  onClose: () => void
  // The branch the screen is already about (the order on the cutting canvas). Without it a global
  // role picks one inside the sheet; the shop floor only ever gets its own.
  branchId?: number
}

// The change the sheet is asking the reason of.
interface Asking extends ChangeIntent {
  type: ConsumableType
}

const needsReason = (error: unknown): boolean =>
  error instanceof ApiError && error.errors.some((e) => e.field === 'reason')

/**
 * «Insumos»: the blades and the glue of one branch, from the shop floor. One sheet for the queue
 * and the cutting canvas — rendered in place, so it also opens over the canvas in fullscreen.
 *
 * A change that comes early (the API's `gate`) is not refused, it is asked about: the sheet turns
 * into the question — the fact it is asked against, three reasons to tap — instead of opening a
 * dialog over itself. One surface and one step back, which is all a 544px panel has room for.
 */
const ConsumablesSheet = ({ visible, onClose, branchId }: ConsumablesSheetProps) => {
  const noteId = useId()
  const addToast = useToastStore((s) => s.addToast)
  const status = useConsumablesStatus(branchId, visible)
  const register = useRegisterChange()
  const voidChange = useVoidChange()

  const [picked, setPicked] = useState<number | null>(null)
  const [asking, setAsking] = useState<Asking | null>(null)
  const [reason, setReason] = useState<ChangeReason | null>(null)
  const [note, setNote] = useState('')
  const [withNote, setWithNote] = useState(false)
  // A fresh sheet each time it opens: the question of the last visit must not be waiting in it.
  // Render-phase adjustment, as in `PauseDialog`.
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setAsking(null)
      register.reset()
      voidChange.reset()
    }
  }

  const branches = status.data ?? []
  const branch = branches.find((b) => b.branchId === picked) ?? branches[0]
  const asked = asking && branch?.items.find((item) => item.type === asking.type)

  const ask = (next: Asking) => {
    register.reset()
    setReason(null)
    setNote('')
    setWithNote(false)
    setAsking(next)
  }

  const submit = (change: Asking, why?: { reason: ChangeReason; note?: string }) => {
    if (!branch) return
    register.mutate(
      { ...change, ...why, branchId: branch.branchId },
      {
        onSuccess: () => {
          track('consumable_changed', { type: change.type, early: !!why })
          addToast(changedToast(change.type), 'success')
          setAsking(null)
        },
        onError: (error) => {
          // The card was a minute stale and offered a plain change where the API wants the
          // reason: ask for it instead of showing the refusal.
          if (!why && needsReason(error)) ask(change)
        },
      },
    )
  }

  const change = (item: ConsumableStatus, intent: ChangeIntent) => {
    const next = { type: item.type, ...intent }
    if (item.gate === 'early') ask(next)
    else submit(next)
  }

  const undo = (item: ConsumableStatus) => {
    if (!item.lastChange) return
    register.reset()
    voidChange.mutate(
      { changeId: item.lastChange.id },
      {
        onSuccess: () => {
          track('consumable_change_undone', { type: item.type })
          addToast('Cambio deshecho', 'secondary')
        },
      },
    )
  }

  if (asking && asked) {
    const blade = isBlade(asking.type)
    return (
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={changeTitle(asking.type)}
        subtitle={branch?.branchName}
        className="consumables-sheet"
        footer={
          <>
            <CButton
              color="secondary"
              variant="outline"
              size="lg"
              disabled={register.isPending}
              onClick={() => setAsking(null)}
            >
              Volver
            </CButton>
            <CButton
              color="primary"
              size="lg"
              className="ms-auto"
              disabled={!reason || register.isPending}
              onClick={() => {
                if (reason) submit(asking, { reason, note: note.trim() || undefined })
              }}
            >
              {register.isPending ? (
                <Spinner size="sm" />
              ) : blade ? (
                'Registrar cambio'
              ) : (
                'Registrar carga'
              )}
            </CButton>
          </>
        }
      >
        <p className="consumables-early">
          <Icon name="warning" size="lg" className="consumables-early__icon" />
          <span>{earlyFact(asked)}</span>
        </p>
        <p className="mb-2 fw-semibold">
          {blade ? '¿Por qué se cambia?' : '¿Por qué se carga de nuevo?'}
        </p>
        <div className="pause-reasons" role="radiogroup" aria-label="Motivo del cambio">
          {REASONS[asking.type].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={reason === value}
              className="pause-reason"
              onClick={() => setReason(value)}
            >
              <Icon name={REASON_ICON[value]} size="xl" className="pause-reason__icon" />
              <span>{REASON_LABEL[value]}</span>
            </button>
          ))}
        </div>
        {withNote ? (
          <div className="mt-3">
            <CFormLabel htmlFor={noteId} className="fs-6">
              Detalle (opcional)
            </CFormLabel>
            <CFormTextarea
              id={noteId}
              rows={2}
              maxLength={255}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Qué pasó"
            />
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-link px-0 mt-2"
            onClick={() => setWithNote(true)}
          >
            Agregar un detalle
          </button>
        )}
        {register.isError && (
          <div className="text-danger mt-2" role="alert">
            {register.error?.message || 'No se pudo registrar el cambio.'}
          </div>
        )}
      </BottomSheet>
    )
  }

  // Whose request is in flight, and whose error to show: the two mutations are the sheet's, so an
  // unscoped `isPending` would freeze every card while one of them registers.
  const acting = register.variables?.type
  const undoing = voidChange.variables?.changeId

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Insumos"
      subtitle={branch?.branchName}
      className="consumables-sheet"
    >
      {status.isLoading ? (
        <LoadingBlock rows={3} label="Cargando los insumos…" />
      ) : status.isError ? (
        <ErrorState
          title="No se pudieron cargar los insumos."
          onRetry={() => void status.refetch()}
        />
      ) : !branch || branch.items.length === 0 ? (
        <EmptyState title="No hay insumos que registrar con tu rol." />
      ) : (
        <>
          {branches.length > 1 && (
            <div className="consumables-branches" role="radiogroup" aria-label="Sucursal">
              {branches.map((b) => (
                <button
                  key={b.branchId}
                  type="button"
                  role="radio"
                  aria-checked={b.branchId === branch.branchId}
                  className="consumables-branch"
                  onClick={() => setPicked(b.branchId)}
                >
                  {b.branchName}
                </button>
              ))}
            </div>
          )}
          <div className="consumables">
            {branch.items.map((item) => {
              const own = item.lastChange?.id === undoing
              return (
                <ConsumableCard
                  // A card per branch: the glue control of one must not carry over to the next.
                  key={`${branch.branchId}-${item.type}`}
                  item={item}
                  pending={
                    (register.isPending && acting === item.type) || (voidChange.isPending && own)
                  }
                  error={
                    register.isError && acting === item.type
                      ? register.error?.message || 'No se pudo registrar el cambio.'
                      : voidChange.isError && own
                        ? voidChange.error?.message || 'No se pudo deshacer el cambio.'
                        : null
                  }
                  onChange={(intent) => change(item, intent)}
                  onUndo={() => undo(item)}
                />
              )
            })}
          </div>
        </>
      )}
    </BottomSheet>
  )
}

export default ConsumablesSheet
