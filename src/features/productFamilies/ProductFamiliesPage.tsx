import { useState } from 'react'
import {
  CBadge,
  CButton,
  CFormCheck,
  CModal,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilPlus, cilTrash } from '@coreui/icons'

import ProductFamilyForm from './ProductFamilyForm'
import ProductFamilyDetailModal from './ProductFamilyDetailModal'
import AssignProductsModal from './AssignProductsModal'
import {
  useCreateProductFamily,
  useDeleteProductFamily,
  useProductFamilies,
  useUpdateProductFamily,
} from './useProductFamilies'
import { familyIssues, type ProductFamily, type ProductFamilyPayload } from './types'
import SearchInput from 'src/shared/components/SearchInput'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import DeleteConfirmModal from 'src/shared/components/DeleteConfirmModal'
import { useListParams } from 'src/shared/hooks/useListParams'
import { useHasRole } from 'src/features/auth/useAuth'

interface FormState {
  visible: boolean
  family: ProductFamily | null
}

/** The design families that pair a board with its edge bandings.
 *
 *  This screen exists because the pairing used to be a free-text key inside each
 *  product's `attributes`, seeded from the vendor's inventory — unmanageable
 *  from here, since the catalog sync rewrites that bag on every pass. The badges
 *  are the catalog-sync warnings that came with the data: judged from the
 *  vendor's rows they would flag designs already fixed here and miss the ones
 *  broken here. */
const ProductFamiliesPage = () => {
  const { getParam, setParam, offset, setOffset, limit, setLimit } = useListParams()
  const search = getParam('q')
  const issuesOnly = getParam('issuesOnly') === 'true'

  // The seller reads the catalog and its groupings; editing them is the admin's,
  // because moving a board between designs changes what gets quoted.
  const canEdit = !useHasRole('vendedor')

  const [formModal, setFormModal] = useState<FormState>({ visible: false, family: null })
  const [detailId, setDetailId] = useState<number | null>(null)
  const [assignTo, setAssignTo] = useState<ProductFamily | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ProductFamily | null>(null)

  const { data, isLoading, isError, refetch } = useProductFamilies({
    search: search || undefined,
    issuesOnly: issuesOnly || undefined,
    offset,
    limit,
  })
  const families = data?.items ?? []

  const createMutation = useCreateProductFamily()
  const updateMutation = useUpdateProductFamily()
  const deleteMutation = useDeleteProductFamily()

  const closeForm = () => {
    setFormModal({ visible: false, family: null })
    createMutation.reset()
    updateMutation.reset()
  }

  const handleSubmit = (payload: ProductFamilyPayload) => {
    const { family } = formModal
    if (family) {
      updateMutation.mutate({ id: family.id, data: payload }, { onSuccess: closeForm })
    } else {
      createMutation.mutate(payload, { onSuccess: closeForm })
    }
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
  }

  return (
    <>
      <div className="surface">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <SearchInput
            value={search}
            onChange={(value) => setParam('q', value, { replace: true })}
            placeholder="Buscar familia…"
            className="flex-grow-1"
            style={{ maxWidth: 360 }}
          />
          <CFormCheck
            id="issues-only"
            label="Solo con problemas"
            checked={issuesOnly}
            onChange={(e) => setParam('issuesOnly', e.target.checked ? 'true' : '')}
          />
          {canEdit && (
            <CButton
              color="primary"
              className="ms-auto"
              onClick={() => setFormModal({ visible: true, family: null })}
            >
              <CIcon icon={cilPlus} className="me-1" />
              Nueva familia
            </CButton>
          )}
        </div>

        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          <CTable align="middle" hover responsive className="list-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Familia</CTableHeaderCell>
                <CTableHeaderCell>Tableros</CTableHeaderCell>
                <CTableHeaderCell>Tapacantos</CTableHeaderCell>
                <CTableHeaderCell>Alias</CTableHeaderCell>
                <CTableHeaderCell>Estado</CTableHeaderCell>
                {canEdit && <CTableHeaderCell />}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {families.length === 0 ? (
                <CTableRow>
                  <CTableDataCell
                    colSpan={canEdit ? 6 : 5}
                    className="text-center text-body-secondary py-5"
                  >
                    {issuesOnly
                      ? 'Ninguna familia tiene problemas de coordinación.'
                      : 'Aún no hay familias.'}
                  </CTableDataCell>
                </CTableRow>
              ) : (
                families.map((f) => {
                  const issues = familyIssues(f)
                  return (
                    <CTableRow key={f.id} onClick={() => setDetailId(f.id)}>
                      <CTableDataCell>
                        <div className="fw-semibold">{f.name}</div>
                        {f.description && (
                          <div className="small text-body-secondary">{f.description}</div>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>{f.boardCount}</CTableDataCell>
                      <CTableDataCell>{f.edgeBandingCount}</CTableDataCell>
                      <CTableDataCell className="text-nowrap">
                        {f.aliases.length > 0 ? f.aliases.join(', ') : '—'}
                      </CTableDataCell>
                      <CTableDataCell>
                        {issues.length === 0 ? (
                          <CBadge color="success">Coordinada</CBadge>
                        ) : (
                          <div className="d-flex flex-wrap gap-1">
                            {issues.map((issue) => (
                              <CBadge key={issue} color="warning">
                                {issue}
                              </CBadge>
                            ))}
                          </div>
                        )}
                      </CTableDataCell>
                      {canEdit && (
                        <CTableDataCell
                          className="text-end text-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CButton
                            color="link"
                            size="sm"
                            className="p-0 me-3"
                            onClick={() => setFormModal({ visible: true, family: f })}
                            aria-label={`Editar ${f.name}`}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="link"
                            size="sm"
                            className="p-0 text-danger"
                            onClick={() => setPendingDelete(f)}
                            aria-label={`Eliminar ${f.name}`}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      )}
                    </CTableRow>
                  )
                })
              )}
            </CTableBody>
          </CTable>
        </QueryState>

        <Pagination
          offset={offset}
          limit={limit}
          total={data?.pagination?.total}
          onChange={setOffset}
          onLimitChange={setLimit}
        />
      </div>

      <CModal visible={formModal.visible} onClose={closeForm} backdrop="static">
        <CModalHeader>
          <CModalTitle>{formModal.family ? 'Editar familia' : 'Nueva familia'}</CModalTitle>
        </CModalHeader>
        <ProductFamilyForm
          key={formModal.family?.id ?? 'new'}
          family={formModal.family}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          error={createMutation.error || updateMutation.error}
        />
      </CModal>

      <ProductFamilyDetailModal
        // Remount per family: the alias drafts inside belong to the one open.
        key={detailId ?? 'closed'}
        familyId={detailId}
        onClose={() => setDetailId(null)}
        onAssign={() => {
          const family = families.find((f) => f.id === detailId)
          if (family) setAssignTo(family)
          setDetailId(null)
        }}
        canEdit={canEdit}
      />

      {assignTo && (
        <AssignProductsModal family={assignTo} visible onClose={() => setAssignTo(null)} />
      )}

      <DeleteConfirmModal
        visible={pendingDelete !== null}
        title="Eliminar familia"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
        isPending={deleteMutation.isPending}
      >
        {/* Non-destructive by design: the FK is ON DELETE SET NULL, so a family
            is a grouping and deleting a grouping can never delete catalog rows. */}
        ¿Eliminar la familia «{pendingDelete?.name}»? Sus{' '}
        {(pendingDelete?.boardCount ?? 0) + (pendingDelete?.edgeBandingCount ?? 0)} productos siguen
        en el catálogo, pero quedan sin coordinar.
      </DeleteConfirmModal>
    </>
  )
}

export default ProductFamiliesPage
