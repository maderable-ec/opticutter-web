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
import NoBranchNotice, { isNoBranchError } from 'src/shared/components/NoBranchNotice'
import { useHasRole, useIsGlobalBranchRole } from 'src/features/auth/useAuth'

import CIcon from '@coreui/icons-react'
import type { ChangeEvent } from 'react'
import type { Client } from 'src/features/clients/types'
import type { OrderStatus } from './types'
import OrderStatusBadge from './OrderStatusBadge'
import { cilPlus } from '@coreui/icons'
import { useActiveBranches } from 'src/features/branches/useBranches'
import { useNavigate } from 'react-router-dom'
import { useOrders } from './useOrders'
import useOrdersFilterStore from './ordersFilterStore'
import { useState } from 'react'

const LIMIT = 20

const STATUSES: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'queued', label: 'En cola' },
  { value: 'cutting', label: 'En corte' },
  { value: 'cut', label: 'Cortada' },
  { value: 'completed', label: 'Completada' },
  { value: 'despachado', label: 'Despachada' },
  { value: 'cancelled', label: 'Cancelada' },
]

const clientName = (c?: Client) =>
  [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.identifier || '—'

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—'

const fmt = (n?: number | null) =>
  n != null ? new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n) : '—'

const OrdersPage = () => {
  const navigate = useNavigate()
  // Operador can view orders but cannot create quotes (that belongs to the optimizer).
  const canCreate = useHasRole('administrador', 'vendedor')
  const isGlobalBranch = useIsGlobalBranchRole()
  const status = useOrdersFilterStore((s) => s.status)
  const setStatus = useOrdersFilterStore((s) => s.setStatus)
  const [branchId, setBranchId] = useState('')
  const [offset, setOffset] = useState(0)

  const statusParam: OrderStatus | OrderStatus[] | undefined = status || undefined

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
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            {isGlobalBranch && (
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
                  <CTableHeaderCell className="bg-body-tertiary text-end">Total</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Creado</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {orders.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center text-body-secondary py-5">
                      Sin resultados
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  orders.map((o) => (
                    <CTableRow key={o.id} onClick={() => navigate(`/orders/${o.id}`)}>
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
                      <CTableDataCell className="text-end text-nowrap">
                        {fmt(o.total)}
                      </CTableDataCell>
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
