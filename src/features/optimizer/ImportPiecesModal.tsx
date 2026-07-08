import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { PREVIEW_LIMIT } from 'src/shared/constants'
import {
  CAlert,
  CButton,
  CFormCheck,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import type { BoardProduct } from 'src/features/products/types'
import { materialLabel } from './optimizerForm'
import type { MaterialForm, RequirementForm } from './optimizerForm'
import { CSV_COLUMNS, parsePieces } from './piecesCsv'

interface ImportPiecesModalProps {
  visible: boolean
  materials: MaterialForm[]
  boards: BoardProduct[]
  onImport: (rows: RequirementForm[], replace: boolean) => void
  onClose: () => void
}

const ImportPiecesModal = ({
  visible,
  materials,
  boards,
  onImport,
  onClose,
}: ImportPiecesModalProps) => {
  const [text, setText] = useState('')
  const [replace, setReplace] = useState(false)

  const { rows, warnings } = useMemo(
    () => parsePieces(text, materials, boards),
    [text, materials, boards],
  )

  const reset = () => {
    setText('')
    setReplace(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
    e.target.value = '' // allows re-selecting the same file
  }

  const confirm = () => {
    if (rows.length === 0) return
    onImport(rows, replace)
    close()
  }

  return (
    <CModal visible={visible} onClose={close} size="lg" alignment="center">
      <CModalHeader>
        <CModalTitle>Importar piezas</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="text-body-secondary small mb-2">
          Pega un rango copiado de Excel/Google Sheets o sube un archivo CSV. Columnas esperadas:{' '}
          <strong>{CSV_COLUMNS.join(' · ')}</strong>. El tapacanto se configura aparte por pieza.
        </p>

        <CFormTextarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Melamina blanca\t720\t400\t4\nMelamina blanca\t300\t580\t2`}
          className="mb-2 font-monospace"
        />

        <div className="d-flex align-items-center gap-3 mb-3">
          <div>
            <CFormLabel className="small mb-1 d-block">…o desde archivo</CFormLabel>
            <input
              type="file"
              accept=".csv,.txt,text/csv"
              className="form-control form-control-sm"
              onChange={handleFile}
            />
          </div>
        </div>

        {rows.length > 0 && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <strong className="small">{rows.length} piezas detectadas</strong>
              {rows.length > PREVIEW_LIMIT && (
                <span className="small text-body-secondary">
                  Mostrando las primeras {PREVIEW_LIMIT}
                </span>
              )}
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              <CTable small bordered className="mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Material</CTableHeaderCell>
                    <CTableHeaderCell>Largo</CTableHeaderCell>
                    <CTableHeaderCell>Ancho</CTableHeaderCell>
                    <CTableHeaderCell>Cant.</CTableHeaderCell>
                    <CTableHeaderCell>Etiqueta</CTableHeaderCell>
                    <CTableHeaderCell>Rotar</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {rows.slice(0, PREVIEW_LIMIT).map((r, i) => {
                    const m = materials.find((x) => x.uid === r.materialUid)
                    return (
                      <CTableRow key={i}>
                        <CTableDataCell>{m ? materialLabel(m, boards) : '—'}</CTableDataCell>
                        <CTableDataCell>{r.height || '—'}</CTableDataCell>
                        <CTableDataCell>{r.width || '—'}</CTableDataCell>
                        <CTableDataCell>{r.quantity}</CTableDataCell>
                        <CTableDataCell>{r.label || '—'}</CTableDataCell>
                        <CTableDataCell>{r.canRotate ? 'sí' : 'no'}</CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </div>
          </>
        )}

        {warnings.length > 0 && (
          <CAlert color="warning" className="mt-3 mb-0 py-2 small">
            <ul className="mb-0 ps-3">
              {warnings.slice(0, 6).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              {warnings.length > 6 && <li>…y {warnings.length - 6} más.</li>}
            </ul>
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter className="justify-content-between">
        <CFormCheck
          id="replace-pieces"
          label="Reemplazar la lista actual"
          checked={replace}
          onChange={(e) => setReplace(e.target.checked)}
        />
        <div className="d-flex gap-2">
          <CButton color="secondary" variant="outline" onClick={close}>
            Cancelar
          </CButton>
          <CButton color="primary" disabled={rows.length === 0} onClick={confirm}>
            Agregar {rows.length || ''} piezas
          </CButton>
        </div>
      </CModalFooter>
    </CModal>
  )
}

export default ImportPiecesModal
