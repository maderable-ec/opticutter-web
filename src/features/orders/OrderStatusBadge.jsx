import React from 'react'
import { CBadge } from '@coreui/react'

const STATUS_CONFIG = {
  draft: { color: 'secondary', label: 'Borrador' },
  quoted: { color: 'light', label: 'Cotizado' },
  confirmed: { color: 'primary', label: 'Confirmado' },
  approved: { color: 'success', label: 'Aprobado' },
  in_production: { color: 'warning', label: 'En producción' },
  cut: { color: 'info', label: 'Cortado' },
  completed: { color: 'success', label: 'Completado' },
  cancelled: { color: 'danger', label: 'Cancelado' },
  expired: { color: 'secondary', label: 'Vencido' },
}

const OrderStatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] ?? { color: 'secondary', label: status }
  return <CBadge color={config.color}>{config.label}</CBadge>
}

export default OrderStatusBadge
