import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilCloudDownload,
  cilCopy,
  cilExternalLink,
  cilSave,
  cilTrash,
} from '@coreui/icons'

import MaterialsPanel from 'src/features/optimizer/MaterialsPanel'
import PiecesTable from 'src/features/optimizer/PiecesTable'
import OptimizationPreview from 'src/features/optimizer/OptimizationPreview'
import EdgeBandingModal from 'src/features/optimizer/EdgeBandingModal'
import ImportPiecesModal from 'src/features/optimizer/ImportPiecesModal'
import { useBoards } from 'src/features/optimizer/useOptimizer'
import { usePiecesEditor } from 'src/features/optimizer/usePiecesEditor'
import {
  buildPayload,
  emptyCatalogMaterial,
  emptyEdgeBanding,
  nextUid,
  piecesSummary,
} from 'src/features/optimizer/optimizerForm'
import type { MaterialForm, RequirementForm } from 'src/features/optimizer/optimizerForm'
import type { MaterialInput, OptimizeResponse, RequirementInput } from 'src/features/optimizer/types'
import { downloadCsv, requirementsToCsv } from 'src/features/optimizer/piecesCsv'
import { ApiError } from 'src/shared/api/types'

import PreOrderStatusBadge from './PreOrderStatusBadge'
import {
  useCreatePreOrderReviewLink,
  useDeletePreOrder,
  usePreOrder,
  usePreOrderReviewLinkInfo,
  useUpdatePreOrder,
} from './usePreOrders'
import { preordersApi } from './preordersApi'
import type { PreOrder } from './types'

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

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null

const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

const LINK_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  used: 'Usado por el cliente',
  revoked: 'Reemplazado',
}

// Inner component: receives an already-loaded pre-order
const PreOrderView = ({ preOrder }: { preOrder: PreOrder }) => {
  const navigate = useNavigate()
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
  const [ebIndex, setEbIndex] = useState<number | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [optimization, setOptimization] = useState<OptimizeResponse>(preOrder.optimization)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const editor = usePiecesEditor(materials, initialFormData?.requirements)

  const { data: boards = [] } = useBoards()
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
        data: { materials: mInputs, requirements: rInputs, notes: notes || undefined },
      },
      {
        onSuccess: (updated) => {
          setOptimization(updated.optimization)
        },
      },
    )
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
      onSuccess: () => navigate('/preorders'),
    })
  }

  const summary = piecesSummary(editor.requirements, materials)
  const canSave = summary.pieces > 0

  const isMissingPhone =
    createReviewLink.error instanceof ApiError &&
    (createReviewLink.error.message?.toLowerCase().includes('celular') ||
      createReviewLink.error.errors?.some((e) => e.message?.toLowerCase().includes('celular')))

  const clientLabel =
    [preOrder.client.firstName, preOrder.client.lastName].filter(Boolean).join(' ') ||
    preOrder.client.identifier

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-3">
        <CButton variant="ghost" color="secondary" size="sm" onClick={() => navigate('/preorders')}>
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
                {canEdit && (
                  <CButton
                    color="primary"
                    size="sm"
                    onClick={handleSave}
                    disabled={updatePreOrder.isPending || !canSave}
                    title={!canSave ? 'Agregá al menos una pieza válida para guardar' : undefined}
                  >
                    {updatePreOrder.isPending ? (
                      <CSpinner size="sm" />
                    ) : (
                      <>
                        <CIcon icon={cilSave} className="me-1" />
                        Guardar
                      </>
                    )}
                  </CButton>
                )}
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
                  onClick={() => preordersApi.downloadProforma(preOrder.id)}
                >
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  Proforma PDF
                </CButton>
                {preOrder.status === 'confirmed' && preOrder.orderId && (
                  <CButton
                    color="success"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/orders/${preOrder.orderId}`)}
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
                    ? 'El cliente no tiene celular registrado. Registrá un número antes de generar el enlace.'
                    : (createReviewLink.error.message || 'Error al generar el enlace.')}
                </CAlert>
              )}
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Status alerts */}
      {preOrder.status === 'changes_requested' && (
        <CAlert color="warning" className="mb-3">
          <strong>El cliente solicitó cambios.</strong> Editá la cotización y volvé a generar el
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

      {/* Notes (editable) */}
      {canEdit && (
        <CCard className="mb-3">
          <CCardHeader>
            <strong>Notas</strong>
          </CCardHeader>
          <CCardBody>
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

      {/* Edit form: materials + pieces */}
      {canEdit && (
        <>
          <CCard className="mb-3">
            <CCardHeader>
              <strong>Tableros (materiales)</strong>
            </CCardHeader>
            <CCardBody>
              <MaterialsPanel
                materials={materials}
                boards={boards}
                onAdd={() => setMaterials((ms) => [...ms, emptyCatalogMaterial()])}
                onRemove={(uid) => {
                  const remaining = materials.filter((m) => m.uid !== uid)
                  setMaterials(remaining)
                  editor.reassignOnMaterialRemoval(uid, remaining)
                }}
                onUpdate={(uid, field, value) =>
                  setMaterials((ms) =>
                    ms.map((m) => (m.uid === uid ? { ...m, [field]: value } : m)),
                  )
                }
              />
            </CCardBody>
          </CCard>

          <CCard className="mb-3">
            <CCardHeader>
              <strong>Piezas</strong>
            </CCardHeader>
            <CCardBody className="p-0">
              <PiecesTable
                editor={editor}
                materials={materials}
                boards={boards}
                onEditEdgeBanding={(i) => setEbIndex(i)}
                onImportOpen={() => setShowImport(true)}
                onExport={() =>
                  downloadCsv(
                    'piezas.csv',
                    requirementsToCsv(editor.requirements, materials, boards),
                  )
                }
              />
            </CCardBody>
          </CCard>
        </>
      )}

      {/* Optimization result — "Optimizar" actúa como Guardar+Recalcular en pre-órdenes */}
      <OptimizationPreview
        result={optimization}
        isPending={updatePreOrder.isPending}
        error={updatePreOrder.error}
        canOptimize={canEdit && canSave}
        onOptimize={handleSave}
      />

      {/* Edge banding modal */}
      {ebIndex !== null && (
        <EdgeBandingModal
          visible
          value={editor.requirements[ebIndex]?.edgeBanding ?? emptyEdgeBanding()}
          onChange={(eb) => editor.update(ebIndex, 'edgeBanding', eb)}
          onClose={() => setEbIndex(null)}
        />
      )}

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
            Copiá este enlace ahora. Por seguridad, no se puede recuperar después de cerrar.
          </CAlert>
          <CInputGroup>
            <CFormInput value={generatedUrl ?? ''} readOnly />
            <CButton color="primary" onClick={handleCopy}>
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
          <CButton
            color="danger"
            onClick={handleDelete}
            disabled={deletePreOrder.isPending}
          >
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
    return (
      <CAlert color="danger">No se pudo cargar la cotización.</CAlert>
    )
  }

  return <PreOrderView preOrder={preOrder} />
}

export default PreOrderDetailPage
