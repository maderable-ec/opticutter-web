import { useState } from 'react'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSave } from '@coreui/icons'

import { useBoards, useOptimize } from './useOptimizer'
import {
  buildPayload,
  emptyCatalogMaterial,
  emptyEdgeBanding,
  emptyRequirement,
} from './optimizerForm'
import type { EdgeBandingForm, MaterialForm, RequirementForm } from './optimizerForm'
import MaterialsPanel from './MaterialsPanel'
import PiecesTable from './PiecesTable'
import OptimizationPreview from './OptimizationPreview'
import EdgeBandingModal from './EdgeBandingModal'
import CreateQuoteModal from './CreateQuoteModal'

const OptimizerPage = () => {
  const [materials, setMaterials] = useState<MaterialForm[]>(() => [emptyCatalogMaterial()])
  const [requirements, setRequirements] = useState<RequirementForm[]>(() => [
    emptyRequirement(materials[0].uid),
  ])
  const [ebIndex, setEbIndex] = useState<number | null>(null)
  const [showQuote, setShowQuote] = useState(false)

  const { data: boards = [] } = useBoards()
  const optimize = useOptimize()

  // --- Materiales ---
  const addMaterial = () => setMaterials((ms) => [...ms, emptyCatalogMaterial()])
  const removeMaterial = (uid: string) => {
    const remaining = materials.filter((m) => m.uid !== uid)
    setMaterials(remaining)
    // Reapunta las piezas del material eliminado; si queda uno solo, las huérfanas pasan a él.
    setRequirements((rs) =>
      rs.map((r) => {
        const orphaned = r.materialUid === uid || r.materialUid === ''
        if (remaining.length === 1 && orphaned) return { ...r, materialUid: remaining[0].uid }
        if (r.materialUid === uid) return { ...r, materialUid: '' }
        return r
      }),
    )
  }
  const updateMaterial = <K extends keyof MaterialForm>(
    uid: string,
    field: K,
    value: MaterialForm[K],
  ) => setMaterials((ms) => ms.map((m) => (m.uid === uid ? { ...m, [field]: value } : m)))

  // --- Piezas ---
  const addRequirement = () =>
    setRequirements((rs) => [...rs, emptyRequirement(materials[0]?.uid ?? '')])
  const removeRequirement = (i: number) => setRequirements((rs) => rs.filter((_, idx) => idx !== i))
  const updateReq = <K extends keyof RequirementForm>(
    i: number,
    field: K,
    value: RequirementForm[K],
  ) => setRequirements((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))
  const updateEdgeBanding = (i: number, eb: EdgeBandingForm) => updateReq(i, 'edgeBanding', eb)

  const built = buildPayload(materials, requirements)
  const canOptimize = built.validCount > 0

  const handleOptimize = () => {
    if (!canOptimize) return
    optimize.mutate({ materials: built.materials, requirements: built.requirements })
  }

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
        requirements={requirements}
        materials={materials}
        boards={boards}
        onAdd={addRequirement}
        onRemove={removeRequirement}
        onUpdate={updateReq}
        onEditEdgeBanding={setEbIndex}
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
        value={ebIndex !== null ? requirements[ebIndex].edgeBanding : emptyEdgeBanding()}
        pieceLabel={ebIndex !== null ? requirements[ebIndex].label || undefined : undefined}
        onChange={(eb) => ebIndex !== null && updateEdgeBanding(ebIndex, eb)}
        onClose={() => setEbIndex(null)}
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
