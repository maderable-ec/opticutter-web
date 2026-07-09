import {
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
import { fmtDateTime } from 'src/shared/utils/format'
import StatusBadge, { type StatusConfigEntry } from './StatusBadge'

// Actor type: the type of entity that performed the action, not a free-form name.
// `actorLabel` is the actor's display name frozen at the time of the status change.
export type ActorType = 'staff' | 'client' | 'system'

const ACTOR_CONFIG: Record<ActorType, StatusConfigEntry> = {
  staff: { color: 'primary', label: 'Equipo' },
  client: { color: 'info', label: 'Cliente' },
  system: { color: 'secondary', label: 'Sistema' },
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
                  {h.actor && <StatusBadge config={ACTOR_CONFIG} value={h.actor} />}
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
