import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import type { ReactNode } from 'react'

// Actor type: the type of entity that performed the action, not a free-form name.
// `actorLabel` is the actor's display name frozen at the time of the status change.
export type ActorType = 'staff' | 'client' | 'system'

const ACTOR_TYPE_LABELS: Record<ActorType, string> = {
  staff: 'Equipo',
  client: 'Cliente',
  system: 'Sistema',
}

const ACTOR_TYPE_COLORS: Record<ActorType, string> = {
  staff: 'primary',
  client: 'info',
  system: 'secondary',
}

// Generic status history entry; used for both orders and pre-orders.
export interface StatusHistoryEntry {
  id: string | number
  fromStatus?: string | null
  toStatus: string
  actor?: ActorType | null
  actorUserId?: number | null
  actorLabel?: string | null
  note?: string | null
  createdAt: string
}

interface StatusHistoryCardProps {
  entries: StatusHistoryEntry[]
  // Each feature renders statuses with its own badge (OrderStatusBadge / PreOrderStatusBadge).
  renderStatus: (status: string) => ReactNode
  title?: string
}

const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

const StatusHistoryCard = ({
  entries,
  renderStatus,
  title = 'Historial',
}: StatusHistoryCardProps) => {
  if (!entries || entries.length === 0) return null

  return (
    <CCard className="mb-3">
      <CCardHeader>
        <strong>{title}</strong>
      </CCardHeader>
      <CCardBody>
        <CTable small responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell className="bg-body-tertiary">Desde</CTableHeaderCell>
              <CTableHeaderCell className="bg-body-tertiary">Hacia</CTableHeaderCell>
              <CTableHeaderCell className="bg-body-tertiary">Actor</CTableHeaderCell>
              <CTableHeaderCell className="bg-body-tertiary">Nota</CTableHeaderCell>
              <CTableHeaderCell className="bg-body-tertiary">Fecha</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {entries.map((h) => (
              <CTableRow key={h.id}>
                <CTableDataCell>{h.fromStatus ? renderStatus(h.fromStatus) : '—'}</CTableDataCell>
                <CTableDataCell>{renderStatus(h.toStatus)}</CTableDataCell>
                <CTableDataCell className="text-nowrap">
                  <span className="me-2">{h.actorLabel ?? '—'}</span>
                  {h.actor && (
                    <CBadge color={ACTOR_TYPE_COLORS[h.actor]}>{ACTOR_TYPE_LABELS[h.actor]}</CBadge>
                  )}
                </CTableDataCell>
                <CTableDataCell>{h.note ?? '—'}</CTableDataCell>
                <CTableDataCell className="text-nowrap">{fmtDateTime(h.createdAt)}</CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  )
}

export default StatusHistoryCard
