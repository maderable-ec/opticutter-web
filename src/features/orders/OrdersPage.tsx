import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSelect,
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
import { cilPlus } from '@coreui/icons'

import type { Client } from 'src/features/clients/types'
import { useHasRole } from 'src/features/auth/useAuth'
import { useActiveBranches } from 'src/features/branches/useBranches'
import NoBranchNotice, { isNoBranchError } from 'src/shared/components/NoBranchNotice'
import OrderStatusBadge from './OrderStatusBadge'
import { useOrders } from './useOrders'
import type { OrderStatus } from './types'

const LIMIT = 20

const STATUSES: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'in_production', label: 'En producción' },
  { value: 'cutting', label: 'En corte' },
  { value: 'cut', label: 'Cortada' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
]

// Estados que el operador puede ver; su opción "Todos" (value '') equivale a este set completo.
const OPERATOR_STATUSES: OrderStatus[] = ['in_production', 'cutting', 'cut']

const OPERATOR_STATUS_OPTIONS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'in_production', label: 'En producción' },
  { value: 'cutting', label: 'En corte' },
  { value: 'cut', label: 'Cortada' },
]

const clientName = (c?: Client) =>
  [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.identifier || '—'

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—'

const fmt = (n?: number | null) =>
  n != null ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(n) : '—'

const OrdersPage = () => {
  const navigate = useNavigate()
  // Operador puede ver órdenes pero no crear cotizaciones (eso es del optimizador).
  const canCreate = useHasRole('administrador', 'vendedor')
  // Sólo el admin filtra por sucursal; el staff queda acotado a la suya por el backend.
  const isAdmin = useHasRole('administrador')
  // El operador trabaja en el piso: solo ve órdenes en producción/cortadas y entra directo al taller.
  const isOperator = useHasRole('operador')
  // Filtro acotado a sus estados visibles; arranca en "Todos" (los tres). El resto usa el set completo.
  const statusOptions = isOperator ? OPERATOR_STATUS_OPTIONS : STATUSES
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [branchId, setBranchId] = useState('')
  const [offset, setOffset] = useState(0)

  // "Todos" del operador (status '') = sus tres estados visibles; "Todos" del resto = sin filtro.
  const statusParam: OrderStatus | OrderStatus[] | undefined =
    status || (isOperator ? OPERATOR_STATUSES : undefined)

  const { data: branches = [] } = useActiveBranches()
  const {
    data: ordersData,
    isLoading,
    error,
  } = useOrders({
    status: statusParam,
    branchId: branchId ? Number(branchId) : undefined,
    offset,
    limit: LIMIT,
  })
  const orders = ordersData?.items ?? []
  const pagination = ordersData?.pagination
  const noBranch = isNoBranchError(error)

  const handleStatusChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value as OrderStatus | '')
    setOffset(0)
  }

  const showPrev = offset > 0
  const showNext = pagination ? offset + LIMIT < pagination.total : false

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Órdenes</strong>
          {canCreate && (
            <CButton color="primary" size="sm" onClick={() => navigate('/optimizer')}>
              <CIcon icon={cilPlus} className="me-1" />
              Nueva cotización
            </CButton>
          )}
        </CCardHeader>
        <CCardBody>
          <CRow className="mb-3">
            <CCol xs={12} sm={6} md={4}>
              <CFormSelect value={status} onChange={handleStatusChange}>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            {isAdmin && (
              <CCol xs={12} sm={6} md={4}>
                <CFormSelect
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value)
                    setOffset(0)
                  }}
                >
                  <option value="">Todas las sucursales</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            )}
          </CRow>

          {noBranch ? (
            <NoBranchNotice />
          ) : isLoading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : (
            <CTable align="middle" hover responsive style={{ cursor: 'pointer' }}>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Código</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Cliente</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Sucursal</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Estado</CTableHeaderCell>
                  {!isOperator && (
                    <CTableHeaderCell className="bg-body-tertiary text-end">Total</CTableHeaderCell>
                  )}
                  <CTableHeaderCell className="bg-body-tertiary">Creado</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {orders.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell
                      colSpan={isOperator ? 5 : 6}
                      className="text-center text-body-secondary py-5"
                    >
                      Sin resultados
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  orders.map((o) => (
                    <CTableRow
                      key={o.id}
                      onClick={() =>
                        navigate(isOperator ? `/orders/${o.id}/workshop` : `/orders/${o.id}`)
                      }
                    >
                      <CTableDataCell>
                        <strong>{o.code ?? '—'}</strong>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div>{clientName(o.client)}</div>
                        <div className="text-body-secondary small">@{o.client?.identifier}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div>{o.branch.name}</div>
                        <div className="text-body-secondary small">{o.branch.code}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <OrderStatusBadge status={o.status} />
                      </CTableDataCell>
                      {!isOperator && (
                        <CTableDataCell className="text-end text-nowrap">
                          {fmt(o.total)}
                        </CTableDataCell>
                      )}
                      <CTableDataCell className="text-nowrap">
                        {fmtDate(o.createdAt)}
                      </CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          )}

          {(showPrev || showNext) && (
            <div className="d-flex justify-content-end gap-2 mt-2">
              <CButton
                size="sm"
                color="secondary"
                disabled={!showPrev}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              >
                Anterior
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                disabled={!showNext}
                onClick={() => setOffset(offset + LIMIT)}
              >
                Siguiente
              </CButton>
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default OrdersPage
