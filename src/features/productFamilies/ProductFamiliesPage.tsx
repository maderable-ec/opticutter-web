import { useState } from 'react'
import {
  CButton,
  CFormCheck,
  CModalHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import FamilyState from './FamilyState'
import ProductFamilyForm from './ProductFamilyForm'
import ProductFamilyDetailModal from './ProductFamilyDetailModal'
import AssignProductsModal from './AssignProductsModal'
import {
  useCreateProductFamily,
  useDeleteProductFamily,
  useProductFamilies,
} from './useProductFamilies'
import { familyIssues, type ProductFamily, type ProductFamilyPayload } from './types'
import SearchInput from 'src/shared/components/SearchInput'
import EmptyState from 'src/shared/components/EmptyState'
import ListToolbar from 'src/shared/components/ListToolbar'
import ListCard from 'src/shared/components/ListCard'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import ConfirmDialog from 'src/shared/components/ConfirmDialog'
import { useListParams } from 'src/shared/hooks/useListParams'
import { useHasRole } from 'src/features/auth/useAuth'
import { Modal, ModalTitle } from 'src/shared/components/Modal'

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

  const [creating, setCreating] = useState(false)
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
  const deleteMutation = useDeleteProductFamily()

  const closeForm = () => {
    setCreating(false)
    createMutation.reset()
  }

  const handleCreate = (payload: ProductFamilyPayload) =>
    createMutation.mutate(payload, { onSuccess: closeForm })

  // Two different dead ends: nothing wrong is good news, an empty catalog is a fact.
  const emptyState = issuesOnly ? (
    <EmptyState icon="ok" title="Ninguna familia tiene problemas de coordinación." />
  ) : (
    <EmptyState title="Aún no hay familias." />
  )

  // A tap on the row opens the family: its products and aliases are what a family is, and its name
  // and note are edited from there. Beside the row only delete, as in the rest of the catalog, whose
  // rows open the record and keep delete apart. In the last column from `md`, beside the card on a
  // phone.
  const rowActions = (f: ProductFamily) =>
    canEdit ? (
      <CButton
        color="link"
        size="sm"
        className="text-danger"
        onClick={() => setPendingDelete(f)}
        aria-label={`Eliminar ${f.name}`}
      >
        <Icon name="delete" />
      </CButton>
    ) : null

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
  }

  return (
    <>
      <div className="surface">
        <ListToolbar>
          <SearchInput
            value={search}
            onChange={(value) => setParam('q', value, { replace: true })}
            placeholder="Buscar familia…"
          />
          <CFormCheck
            id="issues-only"
            label="Solo con problemas"
            checked={issuesOnly}
            onChange={(e) => setParam('issuesOnly', e.target.checked ? 'true' : '')}
          />
          {canEdit && (
            <CButton color="primary" className="ms-auto" onClick={() => setCreating(true)}>
              <Icon name="add" className="me-1" />
              Nueva familia
            </CButton>
          )}
        </ListToolbar>

        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          {/* Both views are mounted and the breakpoint picks one. */}
          <div className="d-md-none">
            {families.length === 0 ? (
              emptyState
            ) : (
              <div className="list-cards">
                {families.map((f) => (
                  <ListCard
                    key={f.id}
                    onClick={() => setDetailId(f.id)}
                    title={f.name}
                    meta={
                      <>
                        <span>
                          {f.boardCount} {f.boardCount === 1 ? 'tablero' : 'tableros'}
                        </span>
                        <span>
                          {f.edgeBandingCount}{' '}
                          {f.edgeBandingCount === 1 ? 'tapacanto' : 'tapacantos'}
                        </span>
                        {f.aliases.length > 0 && <span>{f.aliases.join(', ')}</span>}
                      </>
                    }
                    action={rowActions(f)}
                  >
                    {f.description && (
                      <div className="small text-body-secondary">{f.description}</div>
                    )}
                    <div className="mt-1">
                      <FamilyState issues={familyIssues(f)} />
                    </div>
                  </ListCard>
                ))}
              </div>
            )}
          </div>

          <div className="d-none d-md-block">
            <CTable align="middle" hover responsive className="list-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Familia</CTableHeaderCell>
                  <CTableHeaderCell>Tableros</CTableHeaderCell>
                  <CTableHeaderCell>Tapacantos</CTableHeaderCell>
                  <CTableHeaderCell>Alias</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  {canEdit && (
                    <CTableHeaderCell>
                      <span className="visually-hidden">Acciones</span>
                    </CTableHeaderCell>
                  )}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {families.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={canEdit ? 6 : 5} className="p-0">
                      {emptyState}
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  families.map((f) => {
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
                          <FamilyState issues={familyIssues(f)} />
                        </CTableDataCell>
                        {canEdit && (
                          <CTableDataCell
                            className="text-end text-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {rowActions(f)}
                          </CTableDataCell>
                        )}
                      </CTableRow>
                    )
                  })
                )}
              </CTableBody>
            </CTable>
          </div>
        </QueryState>

        <Pagination
          offset={offset}
          limit={limit}
          total={data?.pagination?.total}
          onChange={setOffset}
          onLimitChange={setLimit}
        />
      </div>

      <Modal visible={creating} onClose={closeForm} backdrop="static" fullscreen="md">
        <CModalHeader>
          <ModalTitle>Nueva familia</ModalTitle>
        </CModalHeader>
        <ProductFamilyForm
          family={null}
          onSubmit={handleCreate}
          onCancel={closeForm}
          isSubmitting={createMutation.isPending}
          error={createMutation.error}
        />
      </Modal>

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

      {/* Back to the family afterwards, where the products just added are listed. */}
      {assignTo && (
        <AssignProductsModal
          family={assignTo}
          visible
          onClose={() => {
            setAssignTo(null)
            setDetailId(assignTo.id)
          }}
        />
      )}

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Eliminar familia"
        confirmLabel="Eliminar"
        tone="danger"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
        pending={deleteMutation.isPending}
      >
        {/* Non-destructive by design: the FK is ON DELETE SET NULL, so a family
            is a grouping and deleting a grouping can never delete catalog rows. */}
        ¿Eliminar la familia «{pendingDelete?.name}»? Sus{' '}
        {(pendingDelete?.boardCount ?? 0) + (pendingDelete?.edgeBandingCount ?? 0)} productos siguen
        en el catálogo, pero quedan sin coordinar.
      </ConfirmDialog>
    </>
  )
}

export default ProductFamiliesPage
