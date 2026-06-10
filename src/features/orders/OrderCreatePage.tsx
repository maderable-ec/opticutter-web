import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCalculator, cilPlus, cilTrash } from '@coreui/icons'

import type { Client } from 'src/features/clients/types'
import { useBoards, useClientsMin, useCreateOrder, useOptimize } from './useOrders'

interface RequirementForm {
  boardId: string
  height: number | string
  width: number | string
  quantity: number | string
  priority: number | string
  label: string
  canRotate: boolean
}

const EMPTY_REQ: RequirementForm = {
  boardId: '',
  height: '',
  width: '',
  quantity: 1,
  priority: 0,
  label: '',
  canRotate: true,
}

const fullClientLabel = (c: Client) => {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
  return name ? `${name} — @${c.identifier}` : `@${c.identifier}`
}

const fmt = (n?: number | null) =>
  n != null ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(n) : '—'

// Construye el payload del contrato vigente: materiales únicos referenciados por materialKey.
const buildMaterialsAndRequirements = (requirements: RequirementForm[]) => {
  const validReqs = requirements.filter(
    (r) => r.boardId && Number(r.height) > 0 && Number(r.width) > 0,
  )
  const boardIds = [...new Set(validReqs.map((r) => Number(r.boardId)))]
  const materials = boardIds.map((id) => ({ key: `b${id}`, source: 'catalog', productId: id }))
  const mapped = validReqs.map((r) => ({
    materialKey: `b${Number(r.boardId)}`,
    height: Number(r.height),
    width: Number(r.width),
    quantity: Number(r.quantity) || 1,
    priority: Number(r.priority) || 0,
    label: r.label || undefined,
    canRotate: r.canRotate,
  }))
  return { materials, requirements: mapped, validCount: validReqs.length }
}

const OrderCreatePage = () => {
  const navigate = useNavigate()

  const [clientSearch, setClientSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [requirements, setRequirements] = useState<RequirementForm[]>([{ ...EMPTY_REQ }])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(clientSearch), 350)
    return () => clearTimeout(t)
  }, [clientSearch])

  const { data: clientsData } = useClientsMin(debouncedSearch)
  const { data: boardsData } = useBoards()
  const clients = clientsData?.items ?? []
  const boards = boardsData?.items ?? []

  const selectedClient = clients.find((c) => String(c.id) === String(selectedClientId))

  const optimize = useOptimize()
  const createOrder = useCreateOrder()

  const addRequirement = () => setRequirements((r) => [...r, { ...EMPTY_REQ }])
  const removeRequirement = (i: number) => setRequirements((r) => r.filter((_, idx) => idx !== i))
  const updateReq = <K extends keyof RequirementForm>(
    i: number,
    field: K,
    value: RequirementForm[K],
  ) => setRequirements((r) => r.map((req, idx) => (idx === i ? { ...req, [field]: value } : req)))

  const {
    materials,
    requirements: mappedReqs,
    validCount,
  } = buildMaterialsAndRequirements(requirements)
  const hasValidPieces = validCount > 0

  const handleOptimize = () => {
    if (!hasValidPieces) return
    optimize.mutate({ materials, requirements: mappedReqs })
  }

  const handleCreateQuote = () => {
    if (!selectedClientId || !hasValidPieces) return
    createOrder.mutate(
      {
        clientId: Number(selectedClientId),
        status: 'quoted',
        source: 'dashboard',
        notes: notes || undefined,
        materials,
        requirements: mappedReqs,
      },
      {
        // Idempotencia: si el id ya existía, el API devuelve la orden activa — navegamos igual.
        onSuccess: (order) => navigate(`/orders/${order.id}`),
      },
    )
  }

  const preview = optimize.data

  return (
    <CForm
      onSubmit={(e) => {
        e.preventDefault()
        handleCreateQuote()
      }}
    >
      <div className="d-flex align-items-center gap-2 mb-3">
        <CButton variant="ghost" color="secondary" size="sm" onClick={() => navigate('/orders')}>
          <CIcon icon={cilArrowLeft} className="me-1" />
          Volver
        </CButton>
        <h5 className="mb-0">Nueva cotización</h5>
      </div>

      {/* Cliente */}
      <CCard className="mb-3">
        <CCardHeader>
          <strong>Cliente</strong>
        </CCardHeader>
        <CCardBody>
          <CFormLabel>
            Buscar cliente <span className="text-danger">*</span>
          </CFormLabel>
          <CFormInput
            placeholder="Nombre o identificador…"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className="mb-1"
          />
          <CFormSelect
            htmlSize={5}
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="">— Seleccionar cliente —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {fullClientLabel(c)}
              </option>
            ))}
          </CFormSelect>
          {selectedClient && selectedClient.phone == null && (
            <CAlert color="warning" className="mt-2 mb-0 py-2 small">
              Este cliente no tiene celular registrado. La cotización no podrá crearse hasta que se
              registre un número.
            </CAlert>
          )}
        </CCardBody>
      </CCard>

      {/* Notas */}
      <CCard className="mb-3">
        <CCardHeader>
          <strong>Notas</strong>
        </CCardHeader>
        <CCardBody>
          <CFormTextarea
            rows={2}
            maxLength={512}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instrucciones especiales, referencias, etc."
          />
        </CCardBody>
      </CCard>

      {/* Piezas */}
      <CCard className="mb-3">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>
            Piezas <span className="text-danger">*</span>
          </strong>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            type="button"
            onClick={addRequirement}
          >
            <CIcon icon={cilPlus} className="me-1" />
            Agregar pieza
          </CButton>
        </CCardHeader>
        <CCardBody>
          <div style={{ overflowX: 'auto' }}>
            <CTable small bordered className="mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Tablero</CTableHeaderCell>
                  <CTableHeaderCell>Alto (mm)</CTableHeaderCell>
                  <CTableHeaderCell>Ancho (mm)</CTableHeaderCell>
                  <CTableHeaderCell>Cant.</CTableHeaderCell>
                  <CTableHeaderCell>Prior.</CTableHeaderCell>
                  <CTableHeaderCell>Etiqueta</CTableHeaderCell>
                  <CTableHeaderCell>Rotar</CTableHeaderCell>
                  <CTableHeaderCell />
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {requirements.map((req, i) => (
                  <CTableRow key={i}>
                    <CTableDataCell style={{ minWidth: 160 }}>
                      <CFormSelect
                        size="sm"
                        value={req.boardId}
                        onChange={(e) => updateReq(i, 'boardId', e.target.value)}
                      >
                        <option value="">Seleccionar…</option>
                        {boards.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </CFormSelect>
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 80 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        value={req.height}
                        onChange={(e) => updateReq(i, 'height', e.target.value)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 80 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        value={req.width}
                        onChange={(e) => updateReq(i, 'width', e.target.value)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 70 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={1}
                        max={10000}
                        value={req.quantity}
                        onChange={(e) => updateReq(i, 'quantity', e.target.value)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 70 }}>
                      <CFormInput
                        size="sm"
                        type="number"
                        min={0}
                        value={req.priority}
                        onChange={(e) => updateReq(i, 'priority', e.target.value)}
                      />
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: 120 }}>
                      <CFormInput
                        size="sm"
                        value={req.label}
                        onChange={(e) => updateReq(i, 'label', e.target.value)}
                        placeholder="Puerta izq."
                      />
                    </CTableDataCell>
                    <CTableDataCell className="text-center" style={{ minWidth: 60 }}>
                      <CFormCheck
                        checked={req.canRotate}
                        onChange={(e) => updateReq(i, 'canRotate', e.target.checked)}
                      />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        size="sm"
                        variant="ghost"
                        color="danger"
                        type="button"
                        disabled={requirements.length === 1}
                        onClick={() => removeRequirement(i)}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>

      {/* Vista previa de optimización */}
      <CCard className="mb-3">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Vista previa de optimización</strong>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            type="button"
            disabled={!hasValidPieces || optimize.isPending}
            onClick={handleOptimize}
          >
            {optimize.isPending ? (
              <CSpinner size="sm" />
            ) : (
              <>
                <CIcon icon={cilCalculator} className="me-1" />
                Optimizar
              </>
            )}
          </CButton>
        </CCardHeader>
        <CCardBody>
          {optimize.error && (
            <CAlert color="danger" className="py-2 small mb-3">
              {optimize.error.message || 'Error al optimizar. Intente nuevamente.'}
            </CAlert>
          )}
          {!preview && !optimize.error && (
            <div className="text-body-secondary small">
              Agregá piezas y presioná “Optimizar” para ver tableros necesarios, costo y eficiencia
              sin crear nada.
            </div>
          )}
          {preview && (
            <>
              <CRow className="g-3 mb-3">
                <CCol xs={6} md={4}>
                  <div className="text-body-secondary small">Tableros usados</div>
                  <div className="fs-5 fw-semibold">{preview.totalBoardsUsed}</div>
                </CCol>
                <CCol xs={6} md={4}>
                  <div className="text-body-secondary small">Costo estimado</div>
                  <div className="fs-5 fw-semibold">
                    {fmt((preview.totalBoardsCost ?? 0) + (preview.totalEdgeBandingCost ?? 0))}
                  </div>
                </CCol>
                <CCol xs={6} md={4}>
                  <div className="text-body-secondary small">Corte lineal</div>
                  <div className="fs-5 fw-semibold">
                    {preview.totalCutLinearM != null
                      ? `${preview.totalCutLinearM.toFixed(2)} m`
                      : '—'}
                  </div>
                </CCol>
              </CRow>
              {preview.materialsSummary?.length > 0 && (
                <CTable small responsive className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell className="bg-body-tertiary">Material</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary text-end">
                        Tableros
                      </CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary text-end">
                        Eficiencia avg
                      </CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary text-end">
                        Costo
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {preview.materialsSummary.map((m) => (
                      <CTableRow key={m.materialKey}>
                        <CTableDataCell>
                          {m.productName ?? m.productCode ?? m.materialKey}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">{m.count}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {m.avgEfficiency != null ? `${m.avgEfficiency.toFixed(1)}%` : '—'}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">{fmt(m.totalCost)}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </>
          )}
        </CCardBody>
      </CCard>

      {/* Acciones */}
      {createOrder.error && (
        <CAlert color="danger" className="py-2 small">
          {createOrder.error.message || 'Error al crear la cotización. Intente nuevamente.'}
        </CAlert>
      )}
      <div className="d-flex justify-content-end gap-2 mb-4">
        <CButton color="secondary" type="button" onClick={() => navigate('/orders')}>
          Cancelar
        </CButton>
        <CButton
          color="primary"
          type="submit"
          disabled={!selectedClientId || !hasValidPieces || createOrder.isPending}
        >
          {createOrder.isPending ? <CSpinner size="sm" /> : 'Crear cotización'}
        </CButton>
      </div>
    </CForm>
  )
}

export default OrderCreatePage
