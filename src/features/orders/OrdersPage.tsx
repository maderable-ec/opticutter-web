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
import OrderStatusBadge from './OrderStatusBadge'
import { useOrders } from './useOrders'
import type { OrderStatus } from './types'

const LIMIT = 20

const STATUSES: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: 'Borrador' },
  { value: 'quoted', label: 'Cotizado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'in_production', label: 'En producción' },
  { value: 'cut', label: 'Cortado' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'expired', label: 'Vencido' },
]

const TERMINAL_STATES: OrderStatus[] = ['completed', 'cancelled', 'expired']

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

const isExpiringSoon = (expiresAt: string | undefined, status: OrderStatus) => {
  if (!expiresAt || TERMINAL_STATES.includes(status)) return false
  const diff = new Date(expiresAt).getTime() - Date.now()
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000
}

const OrdersPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [offset, setOffset] = useState(0)

  const { data: ordersData, isLoading } = useOrders({
    status: status || undefined,
    offset,
    limit: LIMIT,
  })
  const orders = ordersData?.items ?? []
  const pagination = ordersData?.pagination

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
          <CButton color="primary" size="sm" onClick={() => navigate('/optimizer')}>
            <CIcon icon={cilPlus} className="me-1" />
            Nueva cotización
          </CButton>
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
          </CRow>

          {isLoading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : (
            <CTable align="middle" hover responsive style={{ cursor: 'pointer' }}>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Código</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Cliente</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Estado</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary text-end">Total</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Creado</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Vence</CTableHeaderCell>
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
                  orders.map((o) => {
                    const expiringSoon = isExpiringSoon(o.expiresAt, o.status)
                    return (
                      <CTableRow key={o.id} onClick={() => navigate(`/orders/${o.id}`)}>
                        <CTableDataCell>
                          <strong>{o.code ?? '—'}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div>{clientName(o.client)}</div>
                          <div className="text-body-secondary small">@{o.client?.identifier}</div>
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
                        <CTableDataCell
                          className={`text-nowrap ${expiringSoon ? 'text-danger fw-semibold' : ''}`}
                        >
                          {fmtDate(o.expiresAt)}
                          {expiringSoon && ' ⚠'}
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })
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
