import { CButton, CCard, CCardBody, CCardHeader, CFormInput } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'

import SearchableSelect from 'src/shared/components/SearchableSelect'
import { fmtMoney } from 'src/shared/utils/format'
import type { AdditionalService } from 'src/features/services/types'
import type { AdditionalServiceInput } from 'src/features/optimizer/types'

// --- Form model (during editing; numbers may be '' while the user is typing) ---

export interface ServiceLineForm {
  uid: string
  serviceId: string // catalog id ('' = not picked yet)
  name: string // snapshot of the service name (from the catalog on pick)
  unitPrice: number | string
  quantity: number | string
}

let seq = 0
const nextServiceUid = () => `svc-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const emptyServiceLine = (): ServiceLineForm => ({
  uid: nextServiceUid(),
  serviceId: '',
  name: '',
  unitPrice: '',
  quantity: 1,
})

// Rebuilds editable form state from the stored API lines (pre-order detail).
export const serviceLineFromApi = (s: AdditionalServiceInput): ServiceLineForm => ({
  uid: nextServiceUid(),
  serviceId: s.serviceId != null ? String(s.serviceId) : '',
  name: s.name,
  unitPrice: s.unitPrice,
  quantity: s.quantity,
})

const isServiceValid = (s: ServiceLineForm): boolean =>
  s.name.trim().length > 0 && Number(s.unitPrice) >= 0 && Number(s.quantity) > 0

// Builds the API contract from form state; drops incomplete rows.
export const buildServiceLines = (lines: ServiceLineForm[]): AdditionalServiceInput[] =>
  lines.filter(isServiceValid).map((s) => ({
    ...(s.serviceId ? { serviceId: Number(s.serviceId) } : {}),
    name: s.name.trim(),
    unitPrice: Number(s.unitPrice) || 0,
    quantity: Number(s.quantity) || 1,
  }))

interface ServiceLinesProps {
  services: ServiceLineForm[]
  catalog: AdditionalService[]
  onAdd: () => void
  onUpdate: <K extends keyof ServiceLineForm>(
    uid: string,
    field: K,
    value: ServiceLineForm[K],
  ) => void
  onRemove: (uid: string) => void
}

const ServiceLines = ({ services, catalog, onAdd, onUpdate, onRemove }: ServiceLinesProps) => {
  const activeOptions = catalog
    .filter((s) => s.isActive)
    .map((s) => ({ value: String(s.id), label: s.name, sublabel: fmtMoney(s.price) }))

  // Adds a synthetic option for a line whose catalog service is gone/inactive so
  // the picker still shows what was selected.
  const optionsFor = (s: ServiceLineForm) => {
    if (s.serviceId && !activeOptions.some((o) => o.value === s.serviceId)) {
      return [...activeOptions, { value: s.serviceId, label: s.name || 'Servicio', sublabel: '—' }]
    }
    return activeOptions
  }

  const handlePick = (line: ServiceLineForm) => (value: string) => {
    onUpdate(line.uid, 'serviceId', value)
    const svc = catalog.find((s) => String(s.id) === value)
    if (svc) {
      onUpdate(line.uid, 'name', svc.name)
      onUpdate(line.uid, 'unitPrice', svc.price)
    }
  }

  const total = services.reduce(
    (sum, s) => sum + (Number(s.unitPrice) || 0) * (Number(s.quantity) || 0),
    0,
  )

  return (
    <CCard className="mb-3">
      <CCardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <strong>Servicios adicionales</strong>
        <CButton size="sm" color="primary" variant="outline" type="button" onClick={onAdd}>
          <CIcon icon={cilPlus} className="me-1" />
          Agregar servicio
        </CButton>
      </CCardHeader>
      <CCardBody>
        {services.length === 0 ? (
          <div className="text-body-secondary small">
            Sin servicios adicionales. Usa “Agregar servicio” para incluir perforación, armado,
            instalación, etc.
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {services.map((s) => {
              const lineTotal = (Number(s.unitPrice) || 0) * (Number(s.quantity) || 0)
              return (
                <div key={s.uid} className="d-flex flex-wrap align-items-end gap-2">
                  <div style={{ minWidth: 220, flex: '1 1 220px' }}>
                    <label className="form-label small mb-1">Servicio</label>
                    <SearchableSelect
                      size="sm"
                      value={s.serviceId}
                      placeholder="Seleccionar…"
                      searchPlaceholder="Buscar servicio…"
                      emptyText="Sin servicios que coincidan"
                      options={optionsFor(s)}
                      onChange={handlePick(s)}
                    />
                  </div>
                  <div style={{ width: 90 }}>
                    <label className="form-label small mb-1">Cantidad</label>
                    <CFormInput
                      size="sm"
                      type="number"
                      min={1}
                      step={1}
                      value={s.quantity}
                      onChange={(e) => onUpdate(s.uid, 'quantity', e.target.value)}
                    />
                  </div>
                  <div style={{ width: 120 }}>
                    <label className="form-label small mb-1">P. Unit.</label>
                    <CFormInput
                      size="sm"
                      type="number"
                      min={0}
                      step="0.01"
                      value={s.unitPrice}
                      onChange={(e) => onUpdate(s.uid, 'unitPrice', e.target.value)}
                    />
                  </div>
                  <div style={{ width: 100 }} className="text-end">
                    <label className="form-label small mb-1 d-block">Subtotal</label>
                    <span className="small">{fmtMoney(lineTotal)}</span>
                  </div>
                  <CButton
                    size="sm"
                    variant="ghost"
                    color="danger"
                    type="button"
                    title="Eliminar servicio"
                    onClick={() => onRemove(s.uid)}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </div>
              )
            })}
            <div className="d-flex justify-content-end pt-2 border-top">
              <span className="text-body-secondary me-2 small">Servicios adicionales:</span>
              <strong className="small">{fmtMoney(total)}</strong>
            </div>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ServiceLines
