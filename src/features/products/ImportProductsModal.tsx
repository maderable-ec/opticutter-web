import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { PREVIEW_LIMIT } from 'src/shared/constants'
import {
  CAlert,
  CButton,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CProgress,
  CProgressBar,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload } from '@coreui/icons'

import { productsApi } from './productsApi'
import { PRODUCT_CSV_COLUMNS, downloadProductTemplate, parseProducts } from './productsCsv'

interface ImportProductsModalProps {
  visible: boolean
  onClose: () => void
  onImported: () => void
}

type Stage = 'input' | 'importing' | 'done'

const TYPE_LABELS: Record<string, string> = { board: 'Tablero', edge_banding: 'Tapacanto' }

const ImportProductsModal = ({ visible, onClose, onImported }: ImportProductsModalProps) => {
  const [text, setText] = useState('')
  const [stage, setStage] = useState<Stage>('input')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState({ created: 0, updated: 0, errors: 0 })
  const abortRef = useRef(false)

  const { rows, warnings } = useMemo(() => parseProducts(text), [text])

  const reset = () => {
    setText('')
    setStage('input')
    setProgress({ done: 0, total: 0 })
    setResult({ created: 0, updated: 0, errors: 0 })
    abortRef.current = false
  }

  const close = () => {
    if (stage === 'importing') {
      abortRef.current = true
      return
    }
    reset()
    onClose()
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImport = async () => {
    if (rows.length === 0) return
    abortRef.current = false
    setStage('importing')
    setProgress({ done: 0, total: rows.length })

    let created = 0
    let updated = 0
    let errors = 0
    for (let i = 0; i < rows.length; i++) {
      if (abortRef.current) break
      const row = rows[i]
      if (!row) continue
      try {
        const { id, ...payload } = row
        if (id) {
          await productsApi.update(id, payload)
          updated++
        } else {
          await productsApi.create(payload)
          created++
        }
      } catch {
        errors++
      }
      setProgress({ done: i + 1, total: rows.length })
    }

    setResult({ created, updated, errors })
    setStage('done')
    if (created > 0 || updated > 0) onImported()
  }

  const handleDone = () => {
    reset()
    onClose()
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <CModal visible={visible} onClose={close} size="lg" alignment="center">
      <CModalHeader>
        <CModalTitle>Importar productos desde CSV</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {stage === 'input' && (
          <>
            <p className="text-body-secondary small mb-2">
              Pega un rango de Excel/Google Sheets o sube un archivo CSV. Columnas esperadas:{' '}
              <strong>{PRODUCT_CSV_COLUMNS.join(' · ')}</strong>. Si el CSV incluye columna{' '}
              <strong>ID</strong>, las filas existentes se actualizarán en lugar de crear nuevas.
            </p>

            <CFormTextarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="tablero&#9;TAB-001&#9;Melamina Blanca&#9;&#9;15000&#9;si&#9;2440&#9;1220&#9;18"
              className="mb-2 font-monospace"
            />

            <div className="d-flex align-items-end gap-3 mb-3">
              <div>
                <CFormLabel className="small mb-1 d-block">…o desde archivo</CFormLabel>
                <input
                  type="file"
                  accept=".csv,.txt,text/csv"
                  className="form-control form-control-sm"
                  onChange={handleFile}
                />
              </div>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={downloadProductTemplate}
              >
                <CIcon icon={cilCloudDownload} className="me-1" />
                Descargar plantilla
              </CButton>
            </div>

            {rows.length > 0 && (
              <>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong className="small">{rows.length} productos detectados</strong>
                  {rows.length > PREVIEW_LIMIT && (
                    <span className="small text-body-secondary">
                      Mostrando los primeros {PREVIEW_LIMIT}
                    </span>
                  )}
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  <CTable small bordered className="mb-0">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Tipo</CTableHeaderCell>
                        <CTableHeaderCell>Código</CTableHeaderCell>
                        <CTableHeaderCell>Nombre</CTableHeaderCell>
                        <CTableHeaderCell>Precio</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {rows.slice(0, PREVIEW_LIMIT).map((r, i) => (
                        <CTableRow key={i}>
                          <CTableDataCell>{TYPE_LABELS[r.type] ?? r.type}</CTableDataCell>
                          <CTableDataCell>{r.code}</CTableDataCell>
                          <CTableDataCell>{r.name}</CTableDataCell>
                          <CTableDataCell>{r.price}</CTableDataCell>
                        </CTableRow>
                      ))}
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
          </>
        )}

        {stage === 'importing' && (
          <div className="py-4">
            <p className="small mb-2 text-center">
              Importando {progress.done} de {progress.total}…
            </p>
            <CProgress>
              <CProgressBar value={pct} />
            </CProgress>
          </div>
        )}

        {stage === 'done' && (
          <div className="text-center py-4">
            <p className="mb-0">
              {result.created > 0 && (
                <>
                  <strong>{result.created}</strong> producto{result.created !== 1 ? 's' : ''} creado
                  {result.created !== 1 ? 's' : ''}
                </>
              )}
              {result.created > 0 && result.updated > 0 && ', '}
              {result.updated > 0 && (
                <>
                  <strong>{result.updated}</strong> actualizado{result.updated !== 1 ? 's' : ''}
                </>
              )}
              {result.created === 0 && result.updated === 0 && 'Sin cambios'}
              {result.errors > 0 && (
                <>
                  , <span className="text-danger">{result.errors} con error</span>
                </>
              )}
              .
            </p>
          </div>
        )}
      </CModalBody>
      <CModalFooter className="justify-content-end gap-2">
        {stage === 'input' && (
          <>
            <CButton color="secondary" variant="outline" onClick={close}>
              Cancelar
            </CButton>
            <CButton
              color="primary"
              disabled={rows.length === 0}
              onClick={() => void handleImport()}
            >
              Importar {rows.length > 0 ? rows.length : ''} producto{rows.length !== 1 ? 's' : ''}
            </CButton>
          </>
        )}
        {stage === 'done' && (
          <CButton color="primary" onClick={handleDone}>
            Cerrar
          </CButton>
        )}
      </CModalFooter>
    </CModal>
  )
}

export default ImportProductsModal
