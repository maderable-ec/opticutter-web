import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormTextarea,
  CInputGroup,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react'
import type { MaterialForm, RequirementForm } from 'src/features/optimizer/optimizerForm'
import type {
  MaterialInput,
  OptimizeResponse,
  PackingStrategy,
  RequirementInput,
} from 'src/features/optimizer/types'
import type { PreOrder, PreOrderStatus } from './types'
import {
  buildPayload,
  emptyCatalogMaterial,
  emptyEdgeBanding,
  nextUid,
  piecesSummary,
} from 'src/features/optimizer/optimizerForm'
import { cilArrowLeft, cilCloudDownload, cilCopy, cilExternalLink, cilTrash } from '@coreui/icons'
import { downloadCsv, requirementsToCsv } from 'src/features/optimizer/piecesCsv'
import { useBoards, useEdgeBandings } from 'src/features/optimizer/useOptimizer'
import {
  useCreatePreOrderReviewLink,
  useDeletePreOrder,
  usePreOrder,
  usePreOrderReviewLinkInfo,
  useUpdatePreOrder,
} from './usePreOrders'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ApiError } from 'src/shared/api/types'
import { clientName, fmtDate, fmtDateTime } from 'src/shared/utils/format'
import CIcon from '@coreui/icons-react'
import DeleteMaterialModal from 'src/features/optimizer/DeleteMaterialModal'
import ImportPiecesModal from 'src/features/optimizer/ImportPiecesModal'
import MaterialGroups from 'src/features/optimizer/MaterialGroups'
import OptimizationPreview from 'src/features/optimizer/OptimizationPreview'
import OptimizeActionBar from 'src/features/optimizer/OptimizeActionBar'
import PreOrderStatusBadge from './PreOrderStatusBadge'
import PriceTierSelect from 'src/features/settings/PriceTierSelect'
import StatusHistoryCard from 'src/shared/components/StatusHistoryCard'
import { preordersApi } from './preordersApi'
import { useIsGlobalBranchRole } from 'src/features/auth/useAuth'
import { usePiecesEditor } from 'src/features/optimizer/usePiecesEditor'

// Convert stored API format back to editable form state
function formFromPreOrderData(
  materials: MaterialInput[],
  requirements: RequirementInput[],
): { materials: MaterialForm[]; requirements: RequirementForm[] } {
  const keyToUid = new Map<string, string>()
  const matForms: MaterialForm[] = materials.map((m) => {
    const uid = nextUid()
    keyToUid.set(m.key, uid)
    if (m.source === 'catalog') {
      return {
        uid,
        source: 'catalog',
        boardId: String(m.productId),
        label: '',
        height: '',
        width: '',
        thickness: '',
        costPerUnit: '',
      }
    }
    return {
      uid,
      source: m.source,
      boardId: '',
      label: m.label ?? '',
      height: m.height,
      width: m.width,
      thickness: m.thickness,
      costPerUnit: m.costPerUnit ?? 0,
    }
  })
  const reqForms: RequirementForm[] = requirements.map((r) => ({
    materialUid: keyToUid.get(r.materialKey) ?? '',
    height: r.height,
    width: r.width,
    quantity: r.quantity,
    priority: r.priority,
    label: r.label ?? '',
    canRotate: r.canRotate,
    edgeBanding: r.edgeBanding
      ? {
          productId: String(r.edgeBanding.productId),
          sides: {
            top: r.edgeBanding.sides.includes('top'),
            bottom: r.edgeBanding.sides.includes('bottom'),
            left: r.edgeBanding.sides.includes('left'),
            right: r.edgeBanding.sides.includes('right'),
          },
        }
      : emptyEdgeBanding(),
  }))
  return { materials: matForms, requirements: reqForms }
}

const LINK_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  used: 'Usado por el cliente',
  revoked: 'Reemplazado',
}

// Inner component: receives an already-loaded pre-order
const PreOrderView = ({ preOrder }: { preOrder: PreOrder }) => {
  const navigate = useNavigate()
  const isGlobalBranch = useIsGlobalBranchRole()
  const canEdit = ['draft', 'sent', 'changes_requested'].includes(preOrder.status)

  // Compute initial form state only once at mount from API-provided fields.
  const initialFormData = useMemo(() => {
    if (preOrder.materials?.length && preOrder.requirements) {
      return formFromPreOrderData(preOrder.materials, preOrder.requirements)
    }
    return null
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [materials, setMaterials] = useState<MaterialForm[]>(
    () => initialFormData?.materials ?? [emptyCatalogMaterial()],
  )
  const [notes, setNotes] = useState(preOrder.notes ?? '')
  const [priceTierCode, setPriceTierCode] = useState(preOrder.priceTierCode ?? 'consumidor')
  const [strategy, setStrategy] = useState<PackingStrategy>(
    preOrder.optimization.strategy ?? 'default',
  )
  const [showImport, setShowImport] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MaterialForm | null>(null)
  const [optimization, setOptimization] = useState<OptimizeResponse>(preOrder.optimization)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const editor = usePiecesEditor(materials, initialFormData?.requirements)

  const { data: boards = [] } = useBoards()
  const { data: edgeBandings = [] } = useEdgeBandings()
  const updatePreOrder = useUpdatePreOrder()
  const deletePreOrder = useDeletePreOrder()
  const createReviewLink = useCreatePreOrderReviewLink()
  const reviewLinkInfo = usePreOrderReviewLinkInfo(preOrder.id, preOrder.status)

  const handleSave = () => {
    const { materials: mInputs, requirements: rInputs } = buildPayload(
      materials,
      editor.requirements,
    )
    updatePreOrder.mutate(
      {
        id: preOrder.id,
        data: {
          materials: mInputs,
          requirements: rInputs,
          notes: notes || undefined,
          priceTierCode,
          strategy,
        },
      },
      {
        onSuccess: (updated) => {
          setOptimization(updated.optimization)
        },
      },
    )
  }

  const addMaterial = () => setMaterials((ms) => [...ms, emptyCatalogMaterial()])

  const updateMaterial = <K extends keyof MaterialForm>(
    uid: string,
    field: K,
    value: MaterialForm[K],
  ) => setMaterials((ms) => ms.map((m) => (m.uid === uid ? { ...m, [field]: value } : m)))

  // Duplicates a material section together with all of its pieces (same behavior as the optimizer).
  const duplicateMaterial = (m: MaterialForm) => {
    const clone = { ...m, uid: nextUid() }
    setMaterials((ms) => {
      const i = ms.findIndex((x) => x.uid === m.uid)
      return [...ms.slice(0, i + 1), clone, ...ms.slice(i + 1)]
    })
    editor.duplicateGroup(m.uid, clone.uid)
  }

  // Material removal is confirmed through DeleteMaterialModal: pieces are either moved to another
  // material or deleted along with it.
  const requestDeleteMaterial = (m: MaterialForm) => setDeleteTarget(m)

  const handleMovePieces = (destUid: string) => {
    if (!deleteTarget) return
    editor.movePiecesTo(deleteTarget.uid, destUid)
    setMaterials((ms) => ms.filter((m) => m.uid !== deleteTarget.uid))
    setDeleteTarget(null)
  }

  const handleDeleteMaterialWithPieces = () => {
    if (!deleteTarget) return
    editor.removePiecesOf(deleteTarget.uid)
    setMaterials((ms) => {
      const remaining = ms.filter((m) => m.uid !== deleteTarget.uid)
      return remaining.length ? remaining : [emptyCatalogMaterial()]
    })
    setDeleteTarget(null)
  }

  const handleGenerateLink = () => {
    createReviewLink.mutate(preOrder.id, {
      onSuccess: (link) => {
        setCopied(false)
        setGeneratedUrl(link.url)
        setShowRegenModal(false)
      },
    })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl ?? '')
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const handleDelete = () => {
    deletePreOrder.mutate(preOrder.id, {
      onSuccess: () => void navigate('/preorders'),
    })
  }

  const summary = piecesSummary(editor.requirements, materials)
  const canSave = summary.pieces > 0

  const isMissingPhone =
    createReviewLink.error instanceof ApiError &&
    (createReviewLink.error.message?.toLowerCase().includes('celular') ||
      createReviewLink.error.errors?.some((e) => e.message?.toLowerCase().includes('celular')))

  const clientLabel = clientName(preOrder.client)

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-3">
        <CButton
          variant="ghost"
          color="secondary"
          size="sm"
          onClick={() => void navigate('/preorders')}
        >
          <CIcon icon={cilArrowLeft} className="me-1" />
          Volver
        </CButton>
      </div>

      {/* Header card */}
      <CCard className="mb-3">
        <CCardBody>
          <CRow className="g-2 align-items-start">
            <CCol xs={12} md={6}>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h5 className="mb-0">{preOrder.code}</h5>
                <PreOrderStatusBadge status={preOrder.status} />
              </div>
              <div className="text-body-secondary small">
                Cliente: <strong>{clientLabel}</strong>
              </div>
              {isGlobalBranch && (
                <div className="text-body-secondary small">
                  Sucursal: <strong>{preOrder.branch.name}</strong>
                  {preOrder.branch.code && <span> ({preOrder.branch.code})</span>}
                </div>
              )}
              {preOrder.source && (
                <div className="text-body-secondary small">Fuente: {preOrder.source}</div>
              )}
            </CCol>
            <CCol xs={12} md={6}>
              <div className="small">
                <div>
                  <span className="text-body-secondary">Creada:</span>{' '}
                  {fmtDateTime(preOrder.createdAt)}
                </div>
                {preOrder.sentAt && (
                  <div>
                    <span className="text-body-secondary">Enviada:</span>{' '}
                    {fmtDateTime(preOrder.sentAt)}
                  </div>
                )}
                {preOrder.confirmedAt && (
                  <div>
                    <span className="text-body-secondary">Confirmada:</span>{' '}
                    {fmtDateTime(preOrder.confirmedAt)}
                  </div>
                )}
                {preOrder.expiresAt && (
                  <div>
                    <span className="text-body-secondary">Vence:</span>{' '}
                    {fmtDate(preOrder.expiresAt)}
                  </div>
                )}
              </div>
            </CCol>
            <CCol xs={12}>
              <div className="d-flex gap-2 flex-wrap mt-1">
                {/* Saving lives in the sticky "Actualizar cotización" action bar below, so there is
                    no redundant save button up here. */}
                {canEdit && (
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={
                      reviewLinkInfo.data ? () => setShowRegenModal(true) : handleGenerateLink
                    }
                    disabled={createReviewLink.isPending}
                  >
                    {createReviewLink.isPending ? (
                      <CSpinner size="sm" />
                    ) : reviewLinkInfo.data ? (
                      'Regenerar enlace'
                    ) : (
                      'Generar enlace'
                    )}
                  </CButton>
                )}
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => void preordersApi.downloadProforma(preOrder.id)}
                >
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  Proforma PDF
                </CButton>
                {preOrder.status === 'confirmed' && preOrder.orderId && (
                  <CButton
                    color="success"
                    variant="outline"
                    size="sm"
                    onClick={() => void navigate(`/orders/${preOrder.orderId}`)}
                  >
                    <CIcon icon={cilExternalLink} className="me-1" />
                    Ver orden
                  </CButton>
                )}
                {canEdit && (
                  <CButton
                    color="danger"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                )}
              </div>
              {updatePreOrder.error && (
                <CAlert color="danger" className="mt-2 mb-0 py-2 small">
                  {updatePreOrder.error.message || 'Error al guardar la cotización.'}
                </CAlert>
              )}
              {createReviewLink.error && (
                <CAlert
                  color={isMissingPhone ? 'warning' : 'danger'}
                  className="mt-2 mb-0 py-2 small"
                >
                  {isMissingPhone
                    ? 'El cliente no tiene celular registrado. Registra un número antes de generar el enlace.'
                    : createReviewLink.error.message || 'Error al generar el enlace.'}
                </CAlert>
              )}
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Status alerts */}
      {preOrder.status === 'changes_requested' && (
        <CAlert color="warning" className="mb-3">
          <strong>El cliente solicitó cambios.</strong> Edita la cotización y vuelve a generar el
          enlace para que el cliente la revise.
          {preOrder.clientNote && (
            <div className="mt-2 p-2 bg-white bg-opacity-50 rounded small">
              <strong>Nota del cliente:</strong> {preOrder.clientNote}
            </div>
          )}
        </CAlert>
      )}
      {preOrder.status === 'confirmed' && (
        <CAlert color="success" className="mb-3">
          Cotización confirmada.
          {preOrder.orderId && ` Se generó la orden de producción.`}
        </CAlert>
      )}
      {preOrder.status === 'rejected' && (
        <CAlert color="danger" className="mb-3">
          Cotización rechazada por el cliente.
        </CAlert>
      )}
      {preOrder.status === 'expired' && (
        <CAlert color="warning" className="mb-3">
          Esta cotización venció{preOrder.expiresAt ? ` el ${fmtDate(preOrder.expiresAt)}` : ''}.
        </CAlert>
      )}

      {/* Existing review link info */}
      {['draft', 'sent', 'changes_requested'].includes(preOrder.status) && reviewLinkInfo.data && (
        <CCard className="mb-3">
          <CCardHeader>
            <strong>Enlace de revisión</strong>
          </CCardHeader>
          <CCardBody className="small">
            <div>
              Estado:{' '}
              <strong>
                {LINK_STATUS_LABELS[reviewLinkInfo.data.status] ?? reviewLinkInfo.data.status}
              </strong>
            </div>
            <div className="text-body-secondary">
              Creado: {fmtDateTime(reviewLinkInfo.data.createdAt)} · Vence:{' '}
              {fmtDate(reviewLinkInfo.data.expiresAt)}
              {reviewLinkInfo.data.usedAt && ` · Usado: ${fmtDateTime(reviewLinkInfo.data.usedAt)}`}
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* Status history — actor label + actor type badge; see StatusHistoryCard. */}
      <StatusHistoryCard
        entries={preOrder.history ?? []}
        renderStatus={(s) => <PreOrderStatusBadge status={s as PreOrderStatus} />}
      />

      {/* Notes + price tier (editable) */}
      {canEdit && (
        <CCard className="mb-3">
          <CCardHeader>
            <strong>Notas</strong>
          </CCardHeader>
          <CCardBody>
            <div className="mb-3">
              <label className="form-label">Nivel de precio</label>
              <PriceTierSelect value={priceTierCode} onChange={setPriceTierCode} />
            </div>
            <CFormTextarea
              rows={2}
              maxLength={512}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, referencias, etc."
            />
          </CCardBody>
        </CCard>
      )}

      {/* Edit form: grouped materials + pieces (same experience as the optimizer) */}
      {canEdit && (
        <MaterialGroups
          editor={editor}
          materials={materials}
          boards={boards}
          edgeBandings={edgeBandings}
          onAddMaterial={addMaterial}
          onUpdateMaterial={updateMaterial}
          onRequestDeleteMaterial={requestDeleteMaterial}
          onDuplicateMaterial={duplicateMaterial}
          onImportOpen={() => setShowImport(true)}
          onExport={() =>
            downloadCsv('piezas.csv', requirementsToCsv(editor.requirements, materials, boards))
          }
        />
      )}

      {/* Optimization result — the sticky action bar below drives "Optimizar" (Save+Recalculate) */}
      <OptimizationPreview
        result={optimization}
        isPending={updatePreOrder.isPending}
        error={updatePreOrder.error}
      />

      {/* Sticky action bar: cut heuristic + "Optimizar". In pre-orders this saves and recomputes
          server-side; there is no separate "Crear cotización" (this view already is the quote). */}
      {canEdit && (
        <OptimizeActionBar
          strategy={strategy}
          onStrategyChange={setStrategy}
          canOptimize={canSave}
          isPending={updatePreOrder.isPending}
          hasResult={!!optimization}
          onOptimize={handleSave}
          optimizeLabel="Actualizar cotización"
        />
      )}

      {/* Delete material modal: move its pieces to another material or delete them together */}
      <DeleteMaterialModal
        material={deleteTarget}
        pieceCount={
          deleteTarget
            ? editor.requirements.filter((r) => r.materialUid === deleteTarget.uid).length
            : 0
        }
        otherMaterials={deleteTarget ? materials.filter((m) => m.uid !== deleteTarget.uid) : []}
        boards={boards}
        onMove={handleMovePieces}
        onDeleteWithPieces={handleDeleteMaterialWithPieces}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Import pieces modal */}
      <ImportPiecesModal
        visible={showImport}
        materials={materials}
        boards={boards}
        onClose={() => setShowImport(false)}
        onImport={(rows, replace) => {
          editor.addMany(rows, replace)
          setShowImport(false)
        }}
      />

      {/* Generated link modal (shown once; token is not recoverable) */}
      <CModal visible={!!generatedUrl} onClose={() => setGeneratedUrl(null)}>
        <CModalHeader>
          <CModalTitle>Enlace de revisión generado</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CAlert color="warning" className="py-2 small">
            Copia este enlace ahora. Por seguridad, no se puede recuperar después de cerrar.
          </CAlert>
          <CInputGroup>
            <CFormInput value={generatedUrl ?? ''} readOnly />
            <CButton color="primary" onClick={() => void handleCopy()}>
              <CIcon icon={cilCopy} className="me-1" />
              {copied ? '¡Copiado!' : 'Copiar'}
            </CButton>
          </CInputGroup>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setGeneratedUrl(null)}>
            Cerrar
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Regenerate confirmation modal */}
      <CModal visible={showRegenModal} onClose={() => setShowRegenModal(false)}>
        <CModalHeader>
          <CModalTitle>Regenerar enlace</CModalTitle>
        </CModalHeader>
        <CModalBody>
          El enlace anterior dejará de funcionar de inmediato. ¿Generar uno nuevo?
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowRegenModal(false)}>
            Cancelar
          </CButton>
          <CButton
            color="primary"
            onClick={handleGenerateLink}
            disabled={createReviewLink.isPending}
          >
            {createReviewLink.isPending ? <CSpinner size="sm" /> : 'Regenerar'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Delete confirmation modal */}
      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <CModalHeader>
          <CModalTitle>Eliminar cotización</CModalTitle>
        </CModalHeader>
        <CModalBody>
          ¿Eliminar <strong>{preOrder.code}</strong>? Esta acción no puede deshacerse.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </CButton>
          <CButton color="danger" onClick={handleDelete} disabled={deletePreOrder.isPending}>
            {deletePreOrder.isPending ? <CSpinner size="sm" /> : 'Eliminar'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

// Page shell: handles loading/error, then delegates to PreOrderView
const PreOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const numId = id ? Number(id) : undefined
  const { data: preOrder, isLoading, error } = usePreOrder(numId)

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (error || !preOrder) {
    return <CAlert color="danger">No se pudo cargar la cotización.</CAlert>
  }

  return <PreOrderView preOrder={preOrder} />
}

export default PreOrderDetailPage
