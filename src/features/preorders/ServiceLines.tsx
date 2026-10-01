import { useId } from 'react'
import { CButton, CFormInput } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import SearchableSelect from 'src/shared/components/SearchableSelect'
import { fmtMoney } from 'src/shared/utils/format'
import type { AdditionalService } from 'src/features/services/types'
import type { ModalContainer } from 'src/features/optimizer/types'
import { servicesTotal, type ServiceLineForm } from './useServiceLines'

// The service lines, and nothing else — no card and no title, on the same reasoning as
// `MaterialGroups`: the chrome belongs to whoever is placing the list. The pre-order page wraps it
// in a CCard because there it is one section among many; the optimizer's Costos step gives it the
// same plain section heading as "Materiales" and "Tapacantos", because no step renders a card.
//
// "Agregar servicio" stays inside as the dashed slot that ends the list, which is where
// "Agregar material" ended up for the same reason: it is part of the list, not a toolbar.

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
  // Fullscreen portal target for the picker's dropdown; the optimizer runs inside a fullscreen host
  // where a menu portaled to document.body mounts but never paints.
  container?: ModalContainer
}

const ServiceLines = ({
  services,
  catalog,
  onAdd,
  onUpdate,
  onRemove,
  container,
}: ServiceLinesProps) => {
  // Ties each label to its input: the line repeats, so the ids carry the line's uid.
  const uid = useId()
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

  // The editor's running total is what the seller TYPED, i.e. tax included — it
  // has to reconcile with the price list they are reading from, not with the
  // document. The net figure that reaches the quote is computed once, in
  // `servicesNetTotal`, and shown by the breakdown below the tables.
  const total = servicesTotal(services)

  return (
    <div className="mb-3">
      {services.length === 0 ? (
        <div className="text-body-secondary small mb-2">
          Sin servicios adicionales. Agrega perforación, armado, instalación, etc.
        </div>
      ) : (
        <div className="d-flex flex-column gap-2 mb-2">
          {services.map((s) => {
            const lineTotal = (Number(s.unitPrice) || 0) * (Number(s.quantity) || 0)
            const id = (field: string) => `${uid}-${s.uid}-${field}`
            // One row from `md`; on a phone a small grid (`.service-line`): the service across the
            // top beside its trash can, then quantity, price and subtotal side by side. Wrapped as
            // a flex row it broke wherever the widths ran out, and the trash can landed alone.
            return (
              <div key={s.uid} className="service-line">
                <div className="service-line__service">
                  <label className="form-label small mb-1">Servicio</label>
                  <SearchableSelect
                    size="sm"
                    value={s.serviceId}
                    placeholder="Seleccionar…"
                    searchPlaceholder="Buscar servicio…"
                    emptyText="Sin servicios que coincidan"
                    options={optionsFor(s)}
                    onChange={handlePick(s)}
                    container={container}
                  />
                </div>
                <div className="service-line__qty">
                  <label className="form-label small mb-1" htmlFor={id('qty')}>
                    Cantidad
                  </label>
                  <CFormInput
                    id={id('qty')}
                    size="sm"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={s.quantity}
                    onChange={(e) => onUpdate(s.uid, 'quantity', e.target.value)}
                  />
                </div>
                <div className="service-line__price">
                  {/* The one price in the system that is typed WITH tax: it comes
                      off a service price list, not from the vendor's inventory.
                      The server converts it to net so the document's single IVA
                      line covers it too. */}
                  <label
                    className="form-label small mb-1"
                    htmlFor={id('price')}
                    title="IVA incluido"
                  >
                    P. Unit. (c/IVA)
                  </label>
                  <CFormInput
                    id={id('price')}
                    size="sm"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={s.unitPrice}
                    onChange={(e) => onUpdate(s.uid, 'unitPrice', e.target.value)}
                  />
                </div>
                <div className="service-line__total text-end">
                  <div className="form-label small mb-1">Subtotal</div>
                  <span className="small">{fmtMoney(lineTotal)}</span>
                </div>
                <CButton
                  size="sm"
                  variant="ghost"
                  color="danger"
                  type="button"
                  className="service-line__remove"
                  title="Eliminar servicio"
                  aria-label="Eliminar servicio"
                  onClick={() => onRemove(s.uid)}
                >
                  <Icon name="delete" />
                </CButton>
              </div>
            )
          })}
          <div className="d-flex justify-content-end pt-2 border-top">
            <span className="text-body-secondary me-2 small">
              Servicios adicionales (IVA incluido):
            </span>
            <strong className="small">{fmtMoney(total)}</strong>
          </div>
        </div>
      )}

      <CButton
        size="sm"
        color="primary"
        variant="ghost"
        type="button"
        className="add-slot w-100"
        onClick={onAdd}
      >
        <Icon name="add" className="me-1" />
        Agregar servicio
      </CButton>
    </div>
  )
}

export default ServiceLines
