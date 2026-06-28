import { useEffect, useRef, useState } from 'react'
import { CAlert, CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCart, cilCheckAlt, cilFolderOpen, cilPlus, cilSave } from '@coreui/icons'

import { useBoards, useEdgeBandings, useOptimize } from './useOptimizer'
import { useSaveDraft } from './useDrafts'
import { draftsApi } from './draftsApi'
import { buildPayload, emptyCatalogMaterial, isRequirementEmpty } from './optimizerForm'
import type { MaterialForm } from './optimizerForm'
import type { OptimizerDraftPayload, PackingStrategy } from './types'
import { clearAutosave, loadAutosave, saveAutosave } from './optimizerStorage'
import { downloadCsv, requirementsToCsv } from './piecesCsv'
import { usePiecesEditor } from './usePiecesEditor'
import MaterialsPanel from './MaterialsPanel'
import PiecesTable from './PiecesTable'
import OptimizationPreview from './OptimizationPreview'
import ImportPiecesModal from './ImportPiecesModal'
import CreateQuoteModal from './CreateQuoteModal'
import StrategySelect from './StrategySelect'
import DraftsModal from './DraftsModal'
import SaveDraftModal from './SaveDraftModal'
const OptimizerPage = () => {
  // Red de seguridad: leemos el autosave de la sesión anterior UNA vez (inicializador perezoso) y lo
  // usamos para hidratar el estado inicial, en lugar de un efecto de montaje con setState.
  const [bootstrap] = useState(loadAutosave)

  const [materials, setMaterials] = useState<MaterialForm[]>(
    () => bootstrap?.materials ?? [emptyCatalogMaterial()],
  )
  const [showQuote, setShowQuote] = useState(false)
  const [showImport, setShowImport] = useState(false)

  // --- Persistencia de borradores ---
  const [draftId, setDraftId] = useState<number | null>(bootstrap?.draftId ?? null)
  const [draftName, setDraftName] = useState(bootstrap?.draftName ?? '')
  const [showDrafts, setShowDrafts] = useState(false)
  const [showSaveDraft, setShowSaveDraft] = useState(false)
  const [priceTierCode, setPriceTierCode] = useState('consumidor')
  const [strategy, setStrategy] = useState<PackingStrategy>('default')
  const [restored, setRestored] = useState(!!bootstrap)
  const [loadingDraftId, setLoadingDraftId] = useState<number | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: boards = [] } = useBoards()
  const { data: edgeBandings = [] } = useEdgeBandings()
  const optimize = useOptimize()
  const pieces = usePiecesEditor(materials, bootstrap?.requirements)
  const saveDraft = useSaveDraft()

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

  // ¿Hay trabajo que se perdería al resetear? (más de un material, alguno con datos, o piezas no vacías)
  const hasWork =
    materials.length > 1 ||
    materials.some((m) => m.boardId || m.label || m.height !== '' || m.width !== '') ||
    pieces.requirements.some((r) => !isRequirementEmpty(r))

  // --- Autosave debounced: persiste el estado del formulario tal cual (incluye filas incompletas).
  // Si el formulario quedó vacío (p. ej. tras "Nuevo"/"Descartar"), limpia en vez de re-escribir un
  // estado vacío, para que un refresh posterior no muestre el aviso de "restaurado" sin contenido.
  useEffect(() => {
    const t = setTimeout(() => {
      if (hasWork) {
        saveAutosave({
          version: 1,
          savedAt: Date.now(),
          draftId,
          draftName,
          materials,
          requirements: pieces.requirements,
        })
      } else {
        clearAutosave()
      }
    }, 800)
    return () => clearTimeout(t)
  }, [materials, pieces.requirements, draftId, draftName, hasWork])

  // Limpia el timer del flash "Guardado" al desmontar.
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    [],
  )

  const flashSaved = () => {
    setSavedFlash(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setSavedFlash(false), 2000)
  }

  const draftPayload = (): OptimizerDraftPayload => ({
    version: 1,
    materials,
    requirements: pieces.requirements,
  })

  const resetWorkspace = () => {
    setMaterials([emptyCatalogMaterial()])
    pieces.clear()
    setDraftId(null)
    setDraftName('')
    clearAutosave()
  }

  const handleNew = () => {
    if (
      hasWork &&
      !window.confirm('¿Empezar un trabajo nuevo? Se descartará lo que no hayas guardado.')
    )
      return
    resetWorkspace()
    setRestored(false)
  }

  const handleDiscardRestore = () => {
    resetWorkspace()
    setRestored(false)
  }

  // "Guardar borrador": PUT si ya hay draftId; si no, pedir nombre y crear (POST).
  const handleSaveDraft = () => {
    if (draftId) {
      saveDraft.mutate(
        { id: draftId, name: draftName, payload: draftPayload() },
        { onSuccess: flashSaved },
      )
    } else {
      setShowSaveDraft(true)
    }
  }

  const handleSaveNewDraft = (name: string, branchId: number | null) => {
    saveDraft.mutate(
      { name, payload: draftPayload(), branchId: branchId ?? undefined },
      {
        onSuccess: (d) => {
          setDraftId(d.id)
          setDraftName(d.name)
          setShowSaveDraft(false)
          flashSaved()
        },
      },
    )
  }

  // Cargar un borrador del servidor: trae el detalle y reconstruye el formulario idéntico.
  const handleLoadDraft = async (id: number) => {
    setLoadingDraftId(id)
    try {
      const d = await draftsApi.get(id)
      setMaterials(d.payload.materials)
      pieces.addMany(d.payload.requirements, true)
      setDraftId(d.id)
      setDraftName(d.name)
      setRestored(false)
      setShowDrafts(false)
    } finally {
      setLoadingDraftId(null)
    }
  }

  const handleStrategyChange = (newStrategy: PackingStrategy) => {
    setStrategy(newStrategy)
    if (optimize.data && canOptimize) {
      optimize.mutate({
        materials: built.materials,
        requirements: built.requirements,
        priceTierCode,
        strategy: newStrategy,
      })
    }
  }

  const handleOptimize = () => {
    if (!canOptimize) return
    optimize.mutate({
      materials: built.materials,
      requirements: built.requirements,
      priceTierCode,
      strategy,
    })
  }

  const handleExport = () =>
    downloadCsv('piezas.csv', requirementsToCsv(pieces.requirements, materials, boards))

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
        <h5 className="mb-0">Optimizador de corte</h5>
        <div className="d-flex gap-2 flex-wrap">
          <CButton color="secondary" variant="outline" onClick={handleNew}>
            <CIcon icon={cilPlus} className="me-1" />
            Nuevo
          </CButton>
          <CButton color="secondary" variant="outline" onClick={() => setShowDrafts(true)}>
            <CIcon icon={cilFolderOpen} className="me-1" />
            Borradores
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            disabled={saveDraft.isPending}
            onClick={handleSaveDraft}
          >
            {saveDraft.isPending ? (
              <CSpinner size="sm" className="me-1" />
            ) : (
              <CIcon icon={savedFlash ? cilCheckAlt : cilSave} className="me-1" />
            )}
            {savedFlash ? 'Guardado' : 'Guardar borrador'}
          </CButton>
          <CButton color="primary" disabled={!canOptimize} onClick={() => setShowQuote(true)}>
            <CIcon icon={cilCart} className="me-1" />
            Crear cotización
          </CButton>
        </div>
      </div>

      {restored && (
        <CAlert
          color="info"
          className="d-flex align-items-center justify-content-between py-2"
          dismissible
          onClose={() => setRestored(false)}
        >
          <span className="small">
            Restauramos tu trabajo de la sesión anterior.
            {draftName && <strong> Borrador: {draftName}.</strong>}
          </span>
          <CButton color="info" variant="ghost" size="sm" onClick={handleDiscardRestore}>
            Descartar
          </CButton>
        </CAlert>
      )}

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
        edgeBandings={edgeBandings}
        onImportOpen={() => setShowImport(true)}
        onExport={handleExport}
      />

      <div className="mb-3" style={{ maxWidth: 280 }}>
        <label className="form-label">Heurística de corte</label>
        <StrategySelect
          value={strategy}
          onChange={handleStrategyChange}
          disabled={optimize.isPending}
        />
      </div>

      <OptimizationPreview
        result={optimize.data}
        isPending={optimize.isPending}
        error={optimize.error}
        canOptimize={canOptimize}
        onOptimize={handleOptimize}
      />

      <div className="d-flex justify-content-end mb-4">
        <CButton color="primary" disabled={!canOptimize} onClick={() => setShowQuote(true)}>
          <CIcon icon={cilCart} className="me-1" />
          Crear cotización
        </CButton>
      </div>

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
        priceTierCode={priceTierCode}
        onPriceTierChange={setPriceTierCode}
        strategy={strategy}
        onCreated={clearAutosave}
      />

      <DraftsModal
        visible={showDrafts}
        loadingId={loadingDraftId}
        onLoad={handleLoadDraft}
        onClose={() => setShowDrafts(false)}
      />

      <SaveDraftModal
        visible={showSaveDraft}
        isSaving={saveDraft.isPending}
        onSave={handleSaveNewDraft}
        onClose={() => setShowSaveDraft(false)}
        error={saveDraft.error}
      />
    </>
  )
}

export default OptimizerPage
