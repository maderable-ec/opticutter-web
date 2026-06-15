import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload } from '@coreui/icons'

import type { Client } from 'src/features/clients/types'
import { useClientsMin, useCreateOrder } from 'src/features/orders/useOrders'
import type { MaterialInput, RequirementInput } from './types'
import { optimizerApi } from './optimizerApi'

const fullClientLabel = (c: Client) => {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
  return name ? `${name} — @${c.identifier}` : `@${c.identifier}`
}

interface CreateQuoteModalProps {
  visible: boolean
  onClose: () => void
  materials: MaterialInput[]
  requirements: RequirementInput[]
  optimizationHash?: string | null
  // Se invoca tras crear la orden con éxito (p. ej. para limpiar el autosave del optimizer).
  onCreated?: () => void
}

const CreateQuoteModal = ({
  visible,
  onClose,
  materials,
  requirements,
  optimizationHash,
  onCreated,
}: CreateQuoteModalProps) => {
  const navigate = useNavigate()

  const [clientSearch, setClientSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(clientSearch), 350)
    return () => clearTimeout(t)
  }, [clientSearch])

  const { data: clientsData } = useClientsMin(debouncedSearch)
  const clients = clientsData?.items ?? []
  const selectedClient = clients.find((c) => String(c.id) === String(selectedClientId))
  const missingPhone = !!selectedClient && selectedClient.phone == null

  const createOrder = useCreateOrder()

  const handleCreate = () => {
    if (!selectedClientId || missingPhone) return
    createOrder.mutate(
      {
        clientId: Number(selectedClientId),
        status: 'quoted',
        source: 'dashboard',
        notes: notes || undefined,
        materials,
        requirements,
      },
      {
        // Idempotencia: si la orden ya existía, el API devuelve la activa — navegamos igual.
        onSuccess: (order) => {
          onCreated?.()
          onClose()
          navigate(`/orders/${order.id}`)
        },
      },
    )
  }

  const canPreviewProforma = !!optimizationHash && !!selectedClientId && !missingPhone

  return (
    <CModal visible={visible} onClose={onClose} size="lg" alignment="center">
      <CModalHeader>
        <CModalTitle>Crear cotización</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CFormLabel>
          Buscar cliente <span className="text-danger">*</span>
        </CFormLabel>
        <CFormInput
          placeholder="Nombre o identificador…"
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          className="mb-1"
        />
        <CFormSelect
          htmlSize={5}
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
        >
          <option value="">— Seleccionar cliente —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {fullClientLabel(c)}
            </option>
          ))}
        </CFormSelect>
        {missingPhone && (
          <CAlert color="warning" className="mt-2 mb-0 py-2 small">
            Este cliente no tiene celular registrado. La cotización no podrá crearse hasta que se
            registre un número.
          </CAlert>
        )}

        <CFormLabel className="mt-3">Notas</CFormLabel>
        <CFormTextarea
          rows={2}
          maxLength={512}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instrucciones especiales, referencias, etc."
        />

        {createOrder.error && (
          <CAlert color="danger" className="mt-3 mb-0 py-2 small">
            {createOrder.error.message || 'Error al crear la cotización. Intente nuevamente.'}
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter className="d-flex justify-content-between">
        <CButton
          color="secondary"
          variant="ghost"
          disabled={!canPreviewProforma}
          onClick={() =>
            optimizationHash &&
            optimizerApi.downloadOptimizationProforma(optimizationHash, Number(selectedClientId))
          }
        >
          <CIcon icon={cilCloudDownload} className="me-1" />
          Ver proforma
        </CButton>
        <div className="d-flex gap-2">
          <CButton color="secondary" onClick={onClose}>
            Cancelar
          </CButton>
          <CButton
            color="primary"
            disabled={!selectedClientId || missingPhone || createOrder.isPending}
            onClick={handleCreate}
          >
            {createOrder.isPending ? <CSpinner size="sm" /> : 'Crear cotización'}
          </CButton>
        </div>
      </CModalFooter>
    </CModal>
  )
}

export default CreateQuoteModal
