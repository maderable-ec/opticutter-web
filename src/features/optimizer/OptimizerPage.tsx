import { useState } from 'react'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSave } from '@coreui/icons'

import { useBoards, useOptimize } from './useOptimizer'
import { buildPayload, emptyCatalogMaterial, emptyEdgeBanding } from './optimizerForm'
import type { MaterialForm } from './optimizerForm'
import { downloadCsv, requirementsToCsv } from './piecesCsv'
import { usePiecesEditor } from './usePiecesEditor'
import MaterialsPanel from './MaterialsPanel'
import PiecesTable from './PiecesTable'
import OptimizationPreview from './OptimizationPreview'
import EdgeBandingModal from './EdgeBandingModal'
import ImportPiecesModal from './ImportPiecesModal'
import CreateQuoteModal from './CreateQuoteModal'

const OptimizerPage = () => {
  const [materials, setMaterials] = useState<MaterialForm[]>(() => [emptyCatalogMaterial()])
  const [ebIndex, setEbIndex] = useState<number | null>(null)
  const [showQuote, setShowQuote] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const { data: boards = [] } = useBoards()
  const optimize = useOptimize()
  const pieces = usePiecesEditor(materials)

  // --- Materiales ---
  const addMaterial = () => setMaterials((ms) => [...ms, emptyCatalogMaterial()])
  const removeMaterial = (uid: string) => {
    const remaining = materials.filter((m) => m.uid !== uid)
    setMaterials(remaining)
    pieces.reassignOnMaterialRemoval(uid, remaining)
  }
  const updateMaterial = <K extends keyof MaterialForm>(
    uid: string,
    field: K,
    value: MaterialForm[K],
  ) => setMaterials((ms) => ms.map((m) => (m.uid === uid ? { ...m, [field]: value } : m)))

  const built = buildPayload(materials, pieces.requirements)
  const canOptimize = built.validCount > 0

  const handleOptimize = () => {
    if (!canOptimize) return
    optimize.mutate({ materials: built.materials, requirements: built.requirements })
  }

  const handleExport = () =>
    downloadCsv('piezas.csv', requirementsToCsv(pieces.requirements, materials, boards))

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0">Optimizador de corte</h5>
        <CButton color="primary" disabled={!canOptimize} onClick={() => setShowQuote(true)}>
          <CIcon icon={cilSave} className="me-1" />
          Crear cotización
        </CButton>
      </div>

      <MaterialsPanel
        materials={materials}
        boards={boards}
        onAdd={addMaterial}
        onRemove={removeMaterial}
        onUpdate={updateMaterial}
      />

      <PiecesTable
        editor={pieces}
        materials={materials}
        boards={boards}
        onEditEdgeBanding={setEbIndex}
        onImportOpen={() => setShowImport(true)}
        onExport={handleExport}
      />

      <OptimizationPreview
        result={optimize.data}
        isPending={optimize.isPending}
        error={optimize.error}
        canOptimize={canOptimize}
        onOptimize={handleOptimize}
      />

      <div className="d-flex justify-content-end mb-4">
        <CButton color="primary" disabled={!canOptimize} onClick={() => setShowQuote(true)}>
          <CIcon icon={cilSave} className="me-1" />
          Crear cotización
        </CButton>
      </div>

      <EdgeBandingModal
        visible={ebIndex !== null}
        value={ebIndex !== null ? pieces.requirements[ebIndex].edgeBanding : emptyEdgeBanding()}
        pieceLabel={ebIndex !== null ? pieces.requirements[ebIndex].label || undefined : undefined}
        onChange={(eb) => ebIndex !== null && pieces.update(ebIndex, 'edgeBanding', eb)}
        onClose={() => setEbIndex(null)}
      />

      <ImportPiecesModal
        visible={showImport}
        materials={materials}
        boards={boards}
        onImport={(rows, replace) => pieces.addMany(rows, replace)}
        onClose={() => setShowImport(false)}
      />

      <CreateQuoteModal
        visible={showQuote}
        onClose={() => setShowQuote(false)}
        materials={built.materials}
        requirements={built.requirements}
        optimizationHash={optimize.data?.optimizationHash}
      />
    </>
  )
}

export default OptimizerPage
