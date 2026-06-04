import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModalBody,
  CModalFooter,
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
import { cilPlus, cilTrash } from '@coreui/icons'

import { useBoards, useClientsMin } from './useOrders'

const EMPTY_REQ = { boardId: '', height: '', width: '', quantity: 1, priority: 0, label: '', canRotate: true }

const fullClientLabel = (c) => {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
  return name ? `${name} — @${c.identifier}` : `@${c.identifier}`
}

const OrderForm = ({ onSubmit, onCancel, isSubmitting, error }) => {
  const [clientSearch, setClientSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [requirements, setRequirements] = useState([{ ...EMPTY_REQ }])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(clientSearch), 350)
    return () => clearTimeout(t)
  }, [clientSearch])

  const { data: clientsData } = useClientsMin(debouncedSearch)
  const { data: boardsData } = useBoards()
  const clients = clientsData?.items ?? []
  const boards = boardsData?.items ?? []

  const selectedClient = clients.find((c) => String(c.id) === String(selectedClientId))

  const addRequirement = () => setRequirements((r) => [...r, { ...EMPTY_REQ }])
  const removeRequirement = (i) => setRequirements((r) => r.filter((_, idx) => idx !== i))
  const updateReq = (i, field, value) =>
    setRequirements((r) => r.map((req, idx) => (idx === i ? { ...req, [field]: value } : req)))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedClientId) return
    const validReqs = requirements.filter((r) => r.boardId && Number(r.height) > 0 && Number(r.width) > 0)
    if (validReqs.length === 0) return
    onSubmit({
      clientId: Number(selectedClientId),
      notes: notes || undefined,
      source: 'dashboard',
      requirements: validReqs.map((r) => ({
        boardId: Number(r.boardId),
        height: Number(r.height),
        width: Number(r.width),
        quantity: Number(r.quantity) || 1,
        priority: Number(r.priority) || 0,
        label: r.label || undefined,
        canRotate: r.canRotate,
      })),
    })
  }

  return (
    <CForm onSubmit={handleSubmit}>
      <CModalBody>
        <CRow className="g-3">
          <CCol xs={12}>
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
              size={5}
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              required
            >
              <option value="">— Seleccionar cliente —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {fullClientLabel(c)}
                </option>
              ))}
            </CFormSelect>
            {selectedClient && selectedClient.phone === null && (
              <CAlert color="warning" className="mt-2 mb-0 py-2 small">
                Este cliente no tiene celular registrado. La orden no podrá crearse hasta que se registre un número.
              </CAlert>
            )}
          </CCol>

          <CCol xs={12}>
            <CFormLabel>Notas</CFormLabel>
            <CFormTextarea
              rows={2}
              maxLength={512}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, referencias, etc."
            />
          </CCol>

          <CCol xs={12}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <CFormLabel className="mb-0">
                Piezas <span className="text-danger">*</span>
              </CFormLabel>
              <CButton size="sm" color="secondary" variant="outline" type="button" onClick={addRequirement}>
                <CIcon icon={cilPlus} className="me-1" />
                Agregar pieza
              </CButton>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <CTable small bordered className="mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Tablero</CTableHeaderCell>
                    <CTableHeaderCell>Alto (mm)</CTableHeaderCell>
                    <CTableHeaderCell>Ancho (mm)</CTableHeaderCell>
                    <CTableHeaderCell>Cant.</CTableHeaderCell>
                    <CTableHeaderCell>Prior.</CTableHeaderCell>
                    <CTableHeaderCell>Etiqueta</CTableHeaderCell>
                    <CTableHeaderCell>Rotar</CTableHeaderCell>
                    <CTableHeaderCell />
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {requirements.map((req, i) => (
                    <CTableRow key={i}>
                      <CTableDataCell style={{ minWidth: 160 }}>
                        <CFormSelect
                          size="sm"
                          value={req.boardId}
                          onChange={(e) => updateReq(i, 'boardId', e.target.value)}
                          required
                        >
                          <option value="">Seleccionar…</option>
                          {boards.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </CFormSelect>
                      </CTableDataCell>
                      <CTableDataCell style={{ minWidth: 80 }}>
                        <CFormInput
                          size="sm"
                          type="number"
                          min={1}
                          value={req.height}
                          onChange={(e) => updateReq(i, 'height', e.target.value)}
                          required
                        />
                      </CTableDataCell>
                      <CTableDataCell style={{ minWidth: 80 }}>
                        <CFormInput
                          size="sm"
                          type="number"
                          min={1}
                          value={req.width}
                          onChange={(e) => updateReq(i, 'width', e.target.value)}
                          required
                        />
                      </CTableDataCell>
                      <CTableDataCell style={{ minWidth: 70 }}>
                        <CFormInput
                          size="sm"
                          type="number"
                          min={1}
                          max={10000}
                          value={req.quantity}
                          onChange={(e) => updateReq(i, 'quantity', e.target.value)}
                        />
                      </CTableDataCell>
                      <CTableDataCell style={{ minWidth: 70 }}>
                        <CFormInput
                          size="sm"
                          type="number"
                          min={0}
                          value={req.priority}
                          onChange={(e) => updateReq(i, 'priority', e.target.value)}
                        />
                      </CTableDataCell>
                      <CTableDataCell style={{ minWidth: 120 }}>
                        <CFormInput
                          size="sm"
                          value={req.label}
                          onChange={(e) => updateReq(i, 'label', e.target.value)}
                          placeholder="Puerta izq."
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-center" style={{ minWidth: 60 }}>
                        <CFormCheck
                          checked={req.canRotate}
                          onChange={(e) => updateReq(i, 'canRotate', e.target.checked)}
                        />
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton
                          size="sm"
                          variant="ghost"
                          color="danger"
                          type="button"
                          disabled={requirements.length === 1}
                          onClick={() => removeRequirement(i)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          </CCol>

          {error && (
            <CCol xs={12}>
              <div className="text-danger small">
                {error.message || 'Error al crear la orden. Intente nuevamente.'}
              </div>
            </CCol>
          )}
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" type="button" onClick={onCancel}>
          Cancelar
        </CButton>
        <CButton color="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <CSpinner size="sm" /> : 'Crear orden'}
        </CButton>
      </CModalFooter>
    </CForm>
  )
}

export default OrderForm
