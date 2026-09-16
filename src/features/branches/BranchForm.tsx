import { useState } from 'react'
import {
  CAlert,
  CButton,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CModalBody,
  CModalFooter,
  CSpinner,
} from '@coreui/react'
import { apiErrorMessage } from 'src/shared/api/errors'
import type { Branch, BranchPayload, BranchUpdatePayload } from './types'

interface BranchFormProps {
  branch: Branch | null
  onSubmit: (data: BranchPayload | BranchUpdatePayload) => void
  onCancel: () => void
  isSubmitting: boolean
  error: Error | null
}

const BranchForm = ({ branch, onSubmit, onCancel, isSubmitting, error }: BranchFormProps) => {
  const isEdit = branch !== null

  const [code, setCode] = useState(branch?.code ?? '')
  const [name, setName] = useState(branch?.name ?? '')
  const [address, setAddress] = useState(branch?.address ?? '')
  const [phone, setPhone] = useState(branch?.phone ?? '')
  const [isActive, setIsActive] = useState(branch?.isActive ?? true)
  // Default ON for a new branch, matching the API: the admin unticks the shops with no printer.
  const [printLabels, setPrintLabels] = useState(branch?.printLabelsEnabled ?? true)
  const [printConsolidated, setPrintConsolidated] = useState(
    branch?.printConsolidatedEnabled ?? true,
  )
  // Empty on purpose for a new branch: the mapping to the vendor's warehouse is
  // something somebody has to look up, not guess. Empty = no stock consulted.
  const [warehouseCode, setWarehouseCode] = useState(
    branch?.warehouseCode != null ? String(branch.warehouseCode) : '',
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEdit) {
      const payload: BranchUpdatePayload = {
        code,
        name,
        address: address || undefined,
        phone: phone || undefined,
        isActive,
        printLabelsEnabled: printLabels,
        printConsolidatedEnabled: printConsolidated,
        // Explicit null clears it (the API PATCH only touches what it is sent),
        // which is how a branch stops consulting stock.
        warehouseCode: warehouseCode.trim() === '' ? null : Number(warehouseCode),
      }
      onSubmit(payload)
    } else {
      const payload: BranchPayload = {
        code,
        name,
        address: address || undefined,
        phone: phone || undefined,
        printLabelsEnabled: printLabels,
        printConsolidatedEnabled: printConsolidated,
        warehouseCode: warehouseCode.trim() === '' ? null : Number(warehouseCode),
      }
      onSubmit(payload)
    }
  }

  // 409 CONFLICT (duplicate code) and other API errors are surfaced via ApiError.
  const errorMsg = apiErrorMessage(error)

  return (
    <form onSubmit={handleSubmit}>
      <CModalBody>
        {errorMsg && (
          <CAlert color="danger" className="py-2">
            {errorMsg}
          </CAlert>
        )}

        <div className="mb-3">
          <CFormLabel htmlFor="bf-code">Código</CFormLabel>
          <CFormInput
            id="bf-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-3">
          <CFormLabel htmlFor="bf-name">Nombre</CFormLabel>
          <CFormInput
            id="bf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-3">
          <CFormLabel htmlFor="bf-address">Dirección</CFormLabel>
          <CFormInput
            id="bf-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-3">
          <CFormLabel htmlFor="bf-phone">Teléfono</CFormLabel>
          <CFormInput
            id="bf-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {isEdit && (
          <div className="mb-3">
            <CFormCheck
              id="bf-active"
              label="Activa"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSubmitting}
            />
          </div>
        )}

        <div className="mb-3">
          <CFormLabel htmlFor="bf-warehouse">Código de bodega (inventario)</CFormLabel>
          <CFormInput
            id="bf-warehouse"
            type="number"
            min={1}
            step={1}
            value={warehouseCode}
            onChange={(e) => setWarehouseCode(e.target.value)}
            disabled={isSubmitting}
            placeholder="Ej.: 1"
          />
          <div className="form-text">
            Bodega de esta sucursal en el sistema de inventario. Sin este código no se consulta
            stock: ni aviso al cotizar, ni filas en el reporte de stock bajo.
          </div>
        </div>

        <div className="mb-2">
          <CFormLabel>Impresión en el taller</CFormLabel>
          <div className="text-body-secondary small mb-2">
            Desmarca lo que esta sucursal no tenga: no se envía nada a la cola de impresión.
          </div>
          <CFormCheck
            id="bf-print-labels"
            label="Etiquetas por pieza (impresora térmica)"
            checked={printLabels}
            onChange={(e) => setPrintLabels(e.target.checked)}
            disabled={isSubmitting}
          />
          <CFormCheck
            id="bf-print-consolidated"
            label="Hoja consolidada al completar (impresora de hojas)"
            checked={printConsolidated}
            onChange={(e) => setPrintConsolidated(e.target.checked)}
            disabled={isSubmitting}
          />
        </div>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </CButton>
        <CButton color="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <CSpinner size="sm" /> : isEdit ? 'Guardar' : 'Crear'}
        </CButton>
      </CModalFooter>
    </form>
  )
}

export default BranchForm
