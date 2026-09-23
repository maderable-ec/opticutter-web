import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  CAlert,
  CButton,
  CCol,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCart, cilUserPlus } from '@coreui/icons'

import ClientForm from 'src/features/clients/ClientForm'
import ClientPicker from 'src/features/clients/ClientPicker'
import { useCreateClient, useUpdateClient } from 'src/features/clients/useClients'
import type { Client, ClientPayload } from 'src/features/clients/types'
import { useCreatePreOrder } from 'src/features/preorders/usePreOrders'
import {
  buildServiceLines,
  pricingWithServices,
  type ServiceLineForm,
} from 'src/features/preorders/useServiceLines'
import { useHasRole, useIsGlobalBranchRole } from 'src/features/auth/useAuth'
import { useActiveBranches } from 'src/features/branches/useBranches'
import StockAlert from 'src/features/inventory/StockAlert'
import { stockItemsFromPlan } from 'src/features/inventory/stockItems'
import { ApiError } from 'src/shared/api/types'
import { fmtMoney } from 'src/features/review/format'
import type { QuoteDraft } from '../useQuoteDraft'
import type {
  LayoutAdjustment,
  MaterialInput,
  ModalContainer,
  OptimizeResponse,
  RequirementInput,
} from '../types'

// Step 4. What used to be CreateQuoteModal, in a full-width step: the same four inputs the optimizer
// cannot infer (client, branch, price level, reference) plus the confirmation summary that never fit
// inside the modal. Creates a PRE-ORDER; the backend recomputes the plan from these same inputs.

const fullClientLabel = (c: Client) => {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
  return name ? `${name} — @${c.identifier}` : `@${c.identifier}`
}

interface QuoteStepProps {
  result?: OptimizeResponse
  materials: MaterialInput[]
  requirements: RequirementInput[]
  // Chosen back in the Costos step, where its effect on the numbers is visible; carried here only
  // to be sent with the pre-order and shown in the summary.
  priceLevel: number
  // Alternative-solution seed of the layout on screen; persisted with the pre-order so every
  // recompute reproduces the chosen alternative.
  variant: number
  // The seller's hand adjustments to that layout; they ride with the pre-order the same way.
  layoutAdjustments: LayoutAdjustment[] | null
  // Billed services entered in the Costos step. They ride along with the pre-order so a quote built
  // in the wizard is complete on arrival instead of needing a second pass on the detail page.
  services: ServiceLineForm[]
  // Client, branch and reference. Owned by `OptimizerPage` (see `useQuoteDraft`) so stepping back to
  // fix a measure and returning does not empty this form.
  draft: QuoteDraft
  onDraftChange: <K extends keyof QuoteDraft>(key: K, value: QuoteDraft[K]) => void
  container?: ModalContainer
  // Called after the pre-order is created (the page clears its autosave).
  onCreated?: () => void
}

const QuoteStep = ({
  result,
  materials,
  requirements,
  priceLevel,
  variant,
  layoutAdjustments,
  services,
  draft,
  onDraftChange,
  container,
  onCreated,
}: QuoteStepProps) => {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // null = closed. `{ client: null }` is the new-client form, `{ client }` the edit form.
  const [clientModal, setClientModal] = useState<{ client: Client | null } | null>(null)

  const isAdmin = useHasRole('administrador')
  const isGlobalBranch = useIsGlobalBranchRole()
  const { data: branches = [] } = useActiveBranches()

  const selectedClient = draft.client
  const branchId = draft.branchId
  // What the plan consumes, in the units the warehouse counts. Not memoised:
  // React Query hashes the query key structurally, so a fresh array with the
  // same contents is the same key and refetches nothing.
  const stockItems = stockItemsFromPlan(result?.materialsSummary, result?.edgeBandingsSummary)
  const missingPhone = !!selectedClient && selectedClient.phone == null

  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const clientMutation = clientModal?.client ? updateClient : createClient

  // Both mutations are reset on open: a rejected save ("El identificador ya existe") leaves its
  // error on the mutation, and without this it would greet the next person to open the form.
  const openClientModal = (client: Client | null) => {
    createClient.reset()
    updateClient.reset()
    setClientModal({ client })
  }

  // Leaving the wizard to fix the client costs the unsaved workspace, so both dead ends — the client
  // does not exist yet, and the client exists but has no phone (which `blocked` enforces below) —
  // are answered here with the same form the /clients page uses.
  //
  // The saved client is written straight into the draft, which is what refreshes the picker's card
  // after "Completar datos". `useClientsMin` caches under ['clients-min', search] while the CRUD
  // hooks invalidate ['clients'], so the list behind the card is invalidated explicitly, and the
  // identifier goes in the search box so the refetch is certain to contain the new client.
  const handleClientSubmit = (data: ClientPayload) => {
    const editing = clientModal?.client
    const onSuccess = (client: Client) => {
      void qc.invalidateQueries({ queryKey: ['clients-min'] })
      onDraftChange('client', client)
      onDraftChange('clientSearch', client.identifier)
      setClientModal(null)
    }
    if (editing) updateClient.mutate({ id: editing.id, data }, { onSuccess })
    else createClient.mutate(data, { onSuccess })
  }

  const createPreOrder = useCreatePreOrder()
  const isPending = createPreOrder.isPending
  const blocked = !selectedClient || missingPhone || (isAdmin && !branchId)

  // A disabled button has to say what it is waiting for — the same `nextHint`/`nextDisabled` idiom
  // the pre-order detail uses. Without it "Crear cotización" is simply dim, which is how a seller
  // ends up reporting that a click did nothing.
  const blockedReason = !selectedClient
    ? 'Falta elegir el cliente.'
    : missingPhone
      ? 'El cliente no tiene celular registrado.'
      : isAdmin && !branchId
        ? 'Falta elegir la sucursal.'
        : undefined

  const pricing = result?.pricing ? pricingWithServices(result.pricing, services) : undefined

  const handleCreate = () => {
    if (blocked || !selectedClient) return
    createPreOrder.mutate(
      {
        clientId: Number(selectedClient.id),
        source: 'dashboard',
        notes: draft.notes || undefined,
        priceLevel,
        variant,
        layoutAdjustments,
        materials,
        requirements,
        additionalServices: buildServiceLines(services),
        branchId: isGlobalBranch && branchId ? Number(branchId) : undefined,
      },
      {
        onSuccess: (preOrder) => {
          onCreated?.()
          void navigate(`/preorders/${preOrder.id}`)
        },
      },
    )
  }

  const mutationError = createPreOrder.error
  const branchError =
    mutationError instanceof ApiError
      ? mutationError.errors.find((e) => e.field === 'branchId')?.message
      : undefined

  // The form needs no card — its own labels say what each field is, and "Datos de la cotización"
  // only repeated the step's name. The summary keeps a frame because it is a different KIND of
  // thing next to the form: a read-only receipt of what is about to be created.
  return (
    <CRow className="g-3">
      <CCol xs={12} lg={7}>
        <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
          {/* The asterisk belongs to the CHOICE, not to a search box: typing in the box is not
              what the form is waiting for. */}
          <CFormLabel className="mb-0">
            Cliente <span className="text-danger">*</span>
          </CFormLabel>
          <CButton
            size="sm"
            color="primary"
            variant="outline"
            type="button"
            onClick={() => openClientModal(null)}
          >
            <CIcon icon={cilUserPlus} className="me-1" />
            Nuevo cliente
          </CButton>
        </div>
        <ClientPicker
          value={draft.client}
          onChange={(c) => onDraftChange('client', c)}
          search={draft.clientSearch}
          onSearchChange={(term) => onDraftChange('clientSearch', term)}
          onCreateNew={() => openClientModal(null)}
        />
        {missingPhone && selectedClient && (
          <CAlert
            color="warning"
            className="mt-2 mb-0 py-2 small d-flex flex-wrap gap-2 align-items-center"
          >
            <span>
              Este cliente no tiene celular registrado. La cotización no podrá crearse hasta que se
              registre un número.
            </span>
            <CButton
              size="sm"
              color="warning"
              type="button"
              className="ms-auto"
              onClick={() => openClientModal(selectedClient)}
            >
              Completar datos
            </CButton>
          </CAlert>
        )}

        {isGlobalBranch && (
          <>
            <CFormLabel className="mt-3">
              Sucursal {isAdmin && <span className="text-danger">*</span>}
            </CFormLabel>
            <CFormSelect
              value={branchId}
              onChange={(e) => onDraftChange('branchId', e.target.value)}
              invalid={!!branchError}
            >
              <option value="">— Seleccionar sucursal —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </CFormSelect>
            {branchError && <div className="invalid-feedback d-block">{branchError}</div>}
          </>
        )}

        {/* Stock is per branch, so this is the first step that can ask: the
            material of the plan is settled by now and the warehouse is finally
            known. Purely informational — it never gates "Crear cotización". */}
        <div className="mt-3">
          <StockAlert branchId={branchId ? Number(branchId) : null} items={stockItems} />
        </div>

        <CFormLabel className="mt-3">Referencia</CFormLabel>
        <CFormTextarea
          rows={2}
          maxLength={512}
          value={draft.notes}
          onChange={(e) => onDraftChange('notes', e.target.value)}
          placeholder="Ej.: Proyecto Casa Pérez — cocina y closet"
        />
        <div className="form-text">
          Nombre del proyecto u obra para distinguir este pedido de otros del mismo cliente. Se
          imprime en todos los documentos y la ve el cliente.
        </div>

        {mutationError && (
          <CAlert color="danger" className="mt-3 mb-0 py-2 small">
            {mutationError.message || 'Error al crear la cotización. Intente nuevamente.'}
          </CAlert>
        )}
      </CCol>

      <CCol xs={12} lg={5}>
        {/* Same frame as the KPI tiles in the other steps (`Kpi` in summaryTables). */}
        <div className="border rounded-3 p-3">
          <div className="text-body-secondary small text-uppercase fw-semibold mb-2">Resumen</div>
          <div className="d-flex justify-content-between gap-3 py-1 border-bottom">
            <span className="text-body-secondary small">Cliente</span>
            <span className="small fw-semibold text-end">
              {selectedClient ? fullClientLabel(selectedClient) : 'Sin seleccionar'}
            </span>
          </div>
          <div className="d-flex justify-content-between gap-3 py-1 border-bottom">
            <span className="text-body-secondary small">Piezas</span>
            <span className="small fw-semibold text-end">
              {requirements.reduce((n, r) => n + r.quantity, 0)}
            </span>
          </div>
          <div className="d-flex justify-content-between gap-3 py-1 border-bottom">
            <span className="text-body-secondary small">Tableros</span>
            <span className="small fw-semibold text-end">{result?.totalBoardsUsed ?? '—'}</span>
          </div>
          <div className="d-flex justify-content-between gap-3 py-1 border-bottom">
            <span className="text-body-secondary small">Nivel de precio</span>
            <span className="small fw-semibold text-end">
              {result?.pricing?.priceLevelName ?? `Precio ${priceLevel}`}
            </span>
          </div>
          {!!pricing?.servicesTotal && (
            <div className="d-flex justify-content-between gap-3 py-1 border-bottom">
              <span className="text-body-secondary small">Servicios adicionales (sin IVA)</span>
              <span className="small fw-semibold text-end">{fmtMoney(pricing.servicesTotal)}</span>
            </div>
          )}
          {!!pricing?.discountAmount && (
            <>
              <div className="d-flex justify-content-between gap-3 py-1 border-bottom">
                <span className="text-body-secondary small">Subtotal precio</span>
                <span className="small fw-semibold text-end">{fmtMoney(pricing.listSubtotal)}</span>
              </div>
              <div className="d-flex justify-content-between gap-3 py-1 border-bottom text-success">
                <span className="small">Descuento</span>
                <span className="small fw-semibold text-end">
                  -{fmtMoney(pricing.discountAmount)}
                </span>
              </div>
            </>
          )}
          {!!pricing && (
            <>
              <div className="d-flex justify-content-between gap-3 py-1 border-bottom">
                <span className="text-body-secondary small">Subtotal</span>
                <span className="small fw-semibold text-end">{fmtMoney(pricing.subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between gap-3 py-1 border-bottom">
                <span className="text-body-secondary small">
                  IVA ({Math.round(pricing.taxRate * 100)}%)
                </span>
                <span className="small fw-semibold text-end">{fmtMoney(pricing.taxAmount)}</span>
              </div>
            </>
          )}
          <div className="d-flex justify-content-between gap-3 py-2">
            <span className="fw-semibold">Total</span>
            <span className="fw-semibold text-end">{pricing ? fmtMoney(pricing.total) : '—'}</span>
          </div>

          <div className="text-body-secondary small mb-3">
            El total se recalcula en el servidor al crear la cotización, con el nivel de precio
            elegido arriba.
          </div>

          <CButton
            color="primary"
            className="w-100"
            type="button"
            disabled={blocked || isPending}
            onClick={handleCreate}
          >
            {isPending ? (
              <CSpinner size="sm" className="me-1" />
            ) : (
              <CIcon icon={cilCart} className="me-1" />
            )}
            Crear cotización
          </CButton>
          {blockedReason && !isPending && (
            <div className="small text-body-secondary text-center mt-1">{blockedReason}</div>
          )}
        </div>
      </CCol>

      {/* The same form the /clients page uses. It renders its own CModalBody/CModalFooter, so it
          drops in here untouched; `container` is what keeps it painted in fullscreen. */}
      <CModal
        visible={clientModal !== null}
        onClose={() => setClientModal(null)}
        backdrop="static"
        container={container}
      >
        <CModalHeader>
          <CModalTitle>{clientModal?.client ? 'Editar cliente' : 'Nuevo cliente'}</CModalTitle>
        </CModalHeader>
        {clientModal && (
          <ClientForm
            key={clientModal.client?.id ?? 'new'}
            client={clientModal.client}
            onSubmit={handleClientSubmit}
            onCancel={() => setClientModal(null)}
            isSubmitting={clientMutation.isPending}
            error={clientMutation.error}
          />
        )}
      </CModal>
    </CRow>
  )
}

export default QuoteStep
