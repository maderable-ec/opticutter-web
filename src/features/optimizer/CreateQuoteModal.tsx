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

import type { Client } from 'src/features/clients/types'
import { useClientsMin } from 'src/features/orders/useOrders'
import { useCreatePreOrder } from 'src/features/preorders/usePreOrders'
import { useCurrentUser, useHasRole, useIsGlobalBranchRole } from 'src/features/auth/useAuth'
import { useActiveBranches } from 'src/features/branches/useBranches'
import { ApiError } from 'src/shared/api/types'
import PriceTierSelect from 'src/features/settings/PriceTierSelect'
import type { MaterialInput, PackingStrategy, RequirementInput } from './types'

const fullClientLabel = (c: Client) => {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
  return name ? `${name} — @${c.identifier}` : `@${c.identifier}`
}

interface CreateQuoteModalProps {
  visible: boolean
  onClose: () => void
  materials: MaterialInput[]
  requirements: RequirementInput[]
  priceTierCode: string
  onPriceTierChange: (code: string) => void
  strategy: PackingStrategy
  // Se invoca tras crear la orden con éxito (p. ej. para limpiar el autosave del optimizer).
  onCreated?: () => void
}

const CreateQuoteModal = ({
  visible,
  onClose,
  materials,
  requirements,
  priceTierCode,
  onPriceTierChange,
  strategy,
  onCreated,
}: CreateQuoteModalProps) => {
  const navigate = useNavigate()

  const [clientSearch, setClientSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')

  const user = useCurrentUser()
  const isAdmin = useHasRole('administrador')
  const isGlobalBranch = useIsGlobalBranchRole()
  const { data: branches = [] } = useActiveBranches()

  // Admin: sin preselección (campo obligatorio). Vendedor: preselecciona su sucursal base.
  const [branchId, setBranchId] = useState(() => (isAdmin ? '' : String(user?.branchId ?? '')))

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(clientSearch), 350)
    return () => clearTimeout(t)
  }, [clientSearch])

  const { data: clientsData } = useClientsMin(debouncedSearch)
  const clients = clientsData?.items ?? []
  const selectedClient = clients.find((c) => String(c.id) === String(selectedClientId))
  const missingPhone = !!selectedClient && selectedClient.phone == null

  const createPreOrder = useCreatePreOrder()

  const handleCreate = () => {
    if (!selectedClientId || missingPhone || (isAdmin && !branchId)) return
    createPreOrder.mutate(
      {
        clientId: Number(selectedClientId),
        source: 'dashboard',
        notes: notes || undefined,
        priceTierCode,
        strategy,
        materials,
        requirements,
        branchId: isGlobalBranch && branchId ? Number(branchId) : undefined,
      },
      {
        onSuccess: (preOrder) => {
          onCreated?.()
          onClose()
          navigate(`/preorders/${preOrder.id}`)
        },
      },
    )
  }

  const isPending = createPreOrder.isPending
  const mutationError = createPreOrder.error
  const branchError =
    mutationError instanceof ApiError
      ? mutationError.errors.find((e) => e.field === 'branchId')?.message
      : undefined

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

        {isGlobalBranch && (
          <>
            <CFormLabel className="mt-3">
              Sucursal {isAdmin && <span className="text-danger">*</span>}
            </CFormLabel>
            <CFormSelect
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              invalid={!!branchError}
            >
              <option value="">— Seleccionar sucursal —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </CFormSelect>
            {branchError && <div className="invalid-feedback d-block">{branchError}</div>}
          </>
        )}

        <CFormLabel className="mt-3">Nivel de precio</CFormLabel>
        <PriceTierSelect value={priceTierCode} onChange={onPriceTierChange} />

        <CFormLabel className="mt-3">Notas</CFormLabel>
        <CFormTextarea
          rows={2}
          maxLength={512}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instrucciones especiales, referencias, etc."
        />

        {mutationError && (
          <CAlert color="danger" className="mt-3 mb-0 py-2 small">
            {mutationError.message || 'Error al crear la cotización. Intente nuevamente.'}
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancelar
        </CButton>
        <CButton
          color="primary"
          disabled={!selectedClientId || missingPhone || isPending || (isAdmin && !branchId)}
          onClick={handleCreate}
        >
          {isPending ? <CSpinner size="sm" /> : 'Crear cotización'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default CreateQuoteModal
