import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormSelect,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { usePreOrders } from './usePreOrders'
import PreOrderStatusBadge from './PreOrderStatusBadge'
import type { PreOrderStatus } from './types'

const STATUSES: { value: PreOrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviada' },
  { value: 'changes_requested', label: 'Cambios solicitados' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'expired', label: 'Vencida' },
  { value: 'cancelled', label: 'Cancelada' },
]

const LIMIT = 20

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—'

const isExpiringSoon = (expiresAt: string | null, status: PreOrderStatus) => {
  if (!expiresAt || !['draft', 'sent', 'changes_requested'].includes(status)) return false
  const diff = new Date(expiresAt).getTime() - Date.now()
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000
}

const clientLabel = (c: { firstName?: string | null; lastName?: string | null; identifier?: string }) =>
  [c.firstName, c.lastName].filter(Boolean).join(' ') || c.identifier || '—'

const PreOrdersPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<PreOrderStatus | ''>('')
  const [offset, setOffset] = useState(0)

  const { data, isLoading } = usePreOrders({ status: status || undefined, offset, limit: LIMIT })
  const items = data?.items ?? []
  const total = data?.pagination.total ?? 0

  const handleStatusChange = (v: string) => {
    setStatus(v as PreOrderStatus | '')
    setOffset(0)
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h5 className="mb-0">Cotizaciones</h5>
        <CButton color="primary" size="sm" onClick={() => navigate('/optimizer')}>
          Nueva cotización
        </CButton>
      </div>

      <CCard>
        <CCardHeader>
          <CFormSelect
            size="sm"
            style={{ maxWidth: 200 }}
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </CFormSelect>
        </CCardHeader>
        <CCardBody className="p-0">
          {isLoading ? (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          ) : (
            <CTable small hover responsive className="mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Código</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Cliente</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Estado</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Fuente</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Creada</CTableHeaderCell>
                  <CTableHeaderCell className="bg-body-tertiary">Vence</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {items.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center text-body-secondary py-4">
                      Sin resultados
                    </CTableDataCell>
                  </CTableRow>
                )}
                {items.map((po) => {
                  const expiring = isExpiringSoon(po.expiresAt, po.status)
                  return (
                    <CTableRow
                      key={po.id}
                      style={{ cursor: 'pointer' }}
                      className={expiring ? 'text-danger' : ''}
                      onClick={() => navigate(`/preorders/${po.id}`)}
                    >
                      <CTableDataCell className="fw-semibold">{po.code}</CTableDataCell>
                      <CTableDataCell>{clientLabel(po.client)}</CTableDataCell>
                      <CTableDataCell>
                        <PreOrderStatusBadge status={po.status} />
                      </CTableDataCell>
                      <CTableDataCell>{po.source}</CTableDataCell>
                      <CTableDataCell className="text-nowrap">{fmtDate(po.createdAt)}</CTableDataCell>
                      <CTableDataCell className="text-nowrap">
                        {po.expiresAt ? fmtDate(po.expiresAt) : '—'}
                        {expiring && ' ⚠'}
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      {total > LIMIT && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="text-body-secondary small">
            {offset + 1}–{Math.min(offset + LIMIT, total)} de {total}
          </span>
          <div className="d-flex gap-2">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            >
              Anterior
            </CButton>
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              disabled={offset + LIMIT >= total}
              onClick={() => setOffset(offset + LIMIT)}
            >
              Siguiente
            </CButton>
          </div>
        </div>
      )}
    </>
  )
}

export default PreOrdersPage
