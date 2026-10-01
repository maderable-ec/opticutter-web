import type {
  BoardAttributes,
  EdgeBandingAttributes,
  Product,
  ProductListParams,
  ProductPayload,
  ProductType,
} from './types'
import {
  CButton,
  CModalHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct } from './useProducts'
import { useState } from 'react'

import Icon from 'src/shared/icons/Icon'
import ProductForm from './ProductForm'
import SyncCatalogModal from './SyncCatalogModal'
import ProductsFilters, {
  activeCount,
  productFilterParams,
  productsFilterChips,
  prunedSubtypes,
  type ProductsFilterValues,
} from './ProductsFilters'
import { useAllProductFamilies } from 'src/features/productFamilies/useProductFamilies'
import { useHasRole } from 'src/features/auth/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { fmtMoney } from 'src/shared/utils/format'
import SearchInput from 'src/shared/components/SearchInput'
import EmptyState from 'src/shared/components/EmptyState'
import ListToolbar from 'src/shared/components/ListToolbar'
import ListCard from 'src/shared/components/ListCard'
import ActiveBadge from 'src/shared/components/ActiveBadge'
import FilterChips from 'src/shared/components/FilterChips'
import Pagination from 'src/shared/components/Pagination'
import QueryState from 'src/shared/components/QueryState'
import ConfirmDialog from 'src/shared/components/ConfirmDialog'
import StatusBadge, { type StatusConfigEntry } from 'src/shared/components/StatusBadge'
import type { ListSort } from 'src/shared/components/FilterSortSection'
import { useListParams } from 'src/shared/hooks/useListParams'
import { FILTER_SHEET_PARAM } from 'src/shared/hooks/useFilterSheet'
import { Modal, ModalTitle } from 'src/shared/components/Modal'

const TYPE_CONFIG: Record<string, StatusConfigEntry> = {
  board: { tone: 'info', label: 'Tablero' },
  edge_banding: { tone: 'neutral', label: 'Tapacanto' },
  hardware: { tone: 'graphite', label: 'Herraje' },
}
const BAND_TYPE_LABELS: Record<string, string> = { Soft: 'Suave', Hard: 'Duro' }

// Filter fields that live in the URL. `q` is the search box; the rest are the panel's.
const FILTER_KEYS = ['q', 'type', 'subtype', 'isActive', 'family']

interface ProductModalState {
  visible: boolean
  product: Product | null
}

// The catalog carries three net prices per article, but only the list price is
// worth a column: on the real inventory more than half the rows publish the same
// number at every level. The reduced ones show underneath, and only when they
// actually differ, so the table stays readable and the exceptions stand out.
// `withTax` paints the gross twin the API sends; which levels show is always
// decided on the net prices, so both columns list the same ones.
const PriceCell = ({ product, withTax = false }: { product: Product; withTax?: boolean }) => {
  const levels = [
    [product.price2, product.price2WithTax],
    [product.price3, product.price3WithTax],
  ] as const
  const lower = levels
    .filter(([net]) => net != null && net !== product.price)
    .map(([net, gross]) => (withTax ? gross : net))
  return (
    <CTableDataCell>
      {fmtMoney(withTax ? product.priceWithTax : product.price)}
      {lower.length > 0 && (
        <div className="text-body-secondary small">{lower.map((p) => fmtMoney(p)).join(' · ')}</div>
      )}
    </CTableDataCell>
  )
}

/** The design group the product coordinates through, plus the tape's printed code.
 *
 *  Read off the `family` relationship rather than the attributes bag: both moved
 *  to columns of their own because the catalog sync rewrites that bag wholesale
 *  on every pass. An em dash here on a board means its picker comes back empty. */
const FamilyCell = ({ product }: { product: Product }) => (
  <CTableDataCell className="text-nowrap">
    {product.family ? (
      <>
        {product.family.name}
        {product.alias && <span className="text-body-secondary"> · {product.alias}</span>}
      </>
    ) : (
      <span className="text-body-secondary">—</span>
    )}
  </CTableDataCell>
)

// A product's short facts on a phone card: the gross price, the measures of its type and its
// family. The table's per-type columns, as one line.
const ProductFacts = ({ product }: { product: Product }) => {
  const a = (product.attributes ?? {}) as BoardAttributes & EdgeBandingAttributes
  return (
    <>
      <span>c/IVA {fmtMoney(product.priceWithTax)}</span>
      {product.type === 'board' && a.height && a.width && (
        <span>
          {a.height} × {a.width}
          {a.thickness ? ` · ${a.thickness} mm` : ' mm'}
        </span>
      )}
      {product.type === 'edge_banding' && a.width && (
        <span>
          {a.width} × {a.thickness ?? '—'} mm
          {a.bandType ? ` · ${BAND_TYPE_LABELS[a.bandType] ?? a.bandType}` : ''}
        </span>
      )}
      {product.family && (
        <span>
          {product.family.name}
          {product.alias ? ` · ${product.alias}` : ''}
        </span>
      )}
    </>
  )
}

const ProductsPage = () => {
  const isReadOnly = useHasRole('vendedor')
  const queryClient = useQueryClient()
  const {
    getParam,
    getParams,
    setParam,
    setParams,
    clearParams,
    offset,
    setOffset,
    limit,
    setLimit,
  } = useListParams()

  // Shared with the filter menu; the chip needs the name, not just the id.
  const { data: families = [] } = useAllProductFamilies()

  const search = getParam('q')
  const values: ProductsFilterValues = {
    type: getParams('type') as ProductType[],
    subtype: getParams('subtype'),
    isActive: getParam('isActive'),
    family: getParam('family'),
    sort: (getParam('sort') || 'name') as ListSort,
  }

  const handleChange = <K extends keyof ProductsFilterValues>(
    key: K,
    value: ProductsFilterValues[K],
  ) => {
    // Narrowing the type set can strand a subtype that no longer belongs to it, which combines
    // into a guaranteed-empty result. Both keys move in ONE write: two `setSearchParams` in a tick
    // do not compose — react-router's updater still sees the pre-update params, so the second wins.
    if (key === 'type') {
      const nextTypes = value as ProductType[]
      const nextSubtypes = prunedSubtypes(nextTypes, values.subtype)
      setParams({ type: nextTypes, subtype: nextSubtypes })
      return
    }
    setParam(key, value)
  }
  // The phone's sheet applies its draft in one url write, which also closes it.
  const handleApply = (next: ProductsFilterValues) =>
    setParams(
      {
        ...next,
        subtype: prunedSubtypes(next.type, next.subtype),
        sort: next.sort === 'name' ? undefined : next.sort,
        [FILTER_SHEET_PARAM]: undefined,
      },
      { replace: true },
    )
  const handleClear = () => clearParams(FILTER_KEYS)

  const selectedFamily = families.find((f) => String(f.id) === values.family)
  const chips = productsFilterChips(values, handleChange, selectedFamily?.name)
  const isFiltered = activeCount(values) > 0 || search !== ''

  const [formModal, setFormModal] = useState<ProductModalState>({ visible: false, product: null })
  const [deleteModal, setDeleteModal] = useState<ProductModalState>({
    visible: false,
    product: null,
  })
  const [syncModal, setSyncModal] = useState(false)

  // Specialized (per-type) columns only make sense when the filter narrows to
  // exactly one type; with none or both selected, fall back to the generic view.
  const singleType = values.type.length === 1 ? values.type[0] : null

  // Built inline, not memoised: React Query hashes the query key structurally, so a fresh object
  // with the same contents is the same key and does not refetch.
  const queryParams: ProductListParams = {
    ...productFilterParams(values, search),
    sort: values.sort,
    offset,
    limit,
  }

  const { data: productsData, isLoading, isError, refetch } = useProducts(queryParams)
  const products = productsData?.items ?? []
  const pagination = productsData?.pagination

  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()

  const openCreate = () => setFormModal({ visible: true, product: null })
  const openEdit = (product: Product) => setFormModal({ visible: true, product })
  const closeForm = () => {
    setFormModal({ visible: false, product: null })
    createMutation.reset()
    updateMutation.reset()
  }
  const openDelete = (product: Product) => setDeleteModal({ visible: true, product })
  const closeDelete = () => setDeleteModal({ visible: false, product: null })

  const handleSubmit = (data: ProductPayload) => {
    const { product } = formModal
    if (product) {
      updateMutation.mutate({ id: product.id, data }, { onSuccess: closeForm })
    } else {
      createMutation.mutate(data, { onSuccess: closeForm })
    }
  }

  const handleDelete = () => {
    if (!deleteModal.product) return
    deleteMutation.mutate(deleteModal.product.id, { onSuccess: closeDelete })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const formError = createMutation.error || updateMutation.error

  const renderHeaders = () => {
    if (singleType === 'board') {
      return (
        <>
          <CTableHeaderCell className="d-none d-lg-table-cell">ID</CTableHeaderCell>
          <CTableHeaderCell>Código</CTableHeaderCell>
          <CTableHeaderCell>Nombre</CTableHeaderCell>
          <CTableHeaderCell>Precio (s/IVA)</CTableHeaderCell>
          <CTableHeaderCell>Precio (c/IVA)</CTableHeaderCell>
          <CTableHeaderCell>Dimensiones</CTableHeaderCell>
          <CTableHeaderCell>Grosor</CTableHeaderCell>
          <CTableHeaderCell>Familia</CTableHeaderCell>
          <CTableHeaderCell>Estado</CTableHeaderCell>
          <CTableHeaderCell>
            <span className="visually-hidden">Acciones</span>
          </CTableHeaderCell>
        </>
      )
    }
    if (singleType === 'edge_banding') {
      return (
        <>
          <CTableHeaderCell className="d-none d-lg-table-cell">ID</CTableHeaderCell>
          <CTableHeaderCell>Código</CTableHeaderCell>
          <CTableHeaderCell>Nombre</CTableHeaderCell>
          <CTableHeaderCell>Precio (s/IVA)</CTableHeaderCell>
          <CTableHeaderCell>Precio (c/IVA)</CTableHeaderCell>
          <CTableHeaderCell>Grosor</CTableHeaderCell>
          <CTableHeaderCell>Ancho</CTableHeaderCell>
          <CTableHeaderCell>Tipo</CTableHeaderCell>
          <CTableHeaderCell>Color</CTableHeaderCell>
          <CTableHeaderCell>Familia</CTableHeaderCell>
          <CTableHeaderCell>Estado</CTableHeaderCell>
          <CTableHeaderCell>
            <span className="visually-hidden">Acciones</span>
          </CTableHeaderCell>
        </>
      )
    }
    return (
      <>
        <CTableHeaderCell className="d-none d-lg-table-cell">ID</CTableHeaderCell>
        <CTableHeaderCell>Tipo</CTableHeaderCell>
        <CTableHeaderCell>Código</CTableHeaderCell>
        <CTableHeaderCell>Nombre</CTableHeaderCell>
        <CTableHeaderCell>Precio (s/IVA)</CTableHeaderCell>
        <CTableHeaderCell>Precio (c/IVA)</CTableHeaderCell>
        <CTableHeaderCell>Estado</CTableHeaderCell>
        <CTableHeaderCell>
          <span className="visually-hidden">Acciones</span>
        </CTableHeaderCell>
      </>
    )
  }

  // The row opens the editor, so only the destructive action keeps a button — and it must not also
  // open it on the way. In the last column from `md`, beside the card on a phone.
  const deleteButton = (p: Product) =>
    isReadOnly ? null : (
      <CButton
        variant="ghost"
        color="danger"
        size="sm"
        aria-label={`Eliminar ${p.name}`}
        onClick={(e) => {
          e.stopPropagation()
          openDelete(p)
        }}
      >
        <Icon name="delete" />
      </CButton>
    )

  const renderRow = (p: Product) => {
    const actions = (
      <CTableDataCell className="text-end text-nowrap">{deleteButton(p)}</CTableDataCell>
    )

    const statusBadge = <ActiveBadge active={p.isActive} />

    if (singleType === 'board') {
      const a = (p.attributes ?? {}) as BoardAttributes & EdgeBandingAttributes
      return (
        <CTableRow key={p.id} onClick={isReadOnly ? undefined : () => openEdit(p)}>
          <CTableDataCell className="d-none d-lg-table-cell text-body-secondary">
            {p.id}
          </CTableDataCell>
          <CTableDataCell className="text-nowrap">
            <strong>{p.code}</strong>
          </CTableDataCell>
          <CTableDataCell>{p.name}</CTableDataCell>
          <PriceCell product={p} />
          <PriceCell product={p} withTax />
          <CTableDataCell>
            {a.height && a.width ? `${a.height} × ${a.width} mm` : '—'}
          </CTableDataCell>
          <CTableDataCell>{a.thickness ? `${a.thickness} mm` : '—'}</CTableDataCell>
          <FamilyCell product={p} />
          <CTableDataCell>{statusBadge}</CTableDataCell>
          {actions}
        </CTableRow>
      )
    }

    if (singleType === 'edge_banding') {
      const a = (p.attributes ?? {}) as BoardAttributes & EdgeBandingAttributes
      return (
        <CTableRow key={p.id} onClick={isReadOnly ? undefined : () => openEdit(p)}>
          <CTableDataCell className="d-none d-lg-table-cell text-body-secondary">
            {p.id}
          </CTableDataCell>
          <CTableDataCell className="text-nowrap">
            <strong>{p.code}</strong>
          </CTableDataCell>
          <CTableDataCell>{p.name}</CTableDataCell>
          <PriceCell product={p} />
          <PriceCell product={p} withTax />
          <CTableDataCell>{a.thickness != null ? `${a.thickness} mm` : '—'}</CTableDataCell>
          <CTableDataCell>{a.width ? `${a.width} mm` : '—'}</CTableDataCell>
          <CTableDataCell>
            {a.bandType ? (BAND_TYPE_LABELS[a.bandType] ?? a.bandType) : '—'}
          </CTableDataCell>
          <CTableDataCell>{a.color ?? '—'}</CTableDataCell>
          <FamilyCell product={p} />
          <CTableDataCell>{statusBadge}</CTableDataCell>
          {actions}
        </CTableRow>
      )
    }

    return (
      <CTableRow key={p.id} onClick={isReadOnly ? undefined : () => openEdit(p)}>
        <CTableDataCell className="d-none d-lg-table-cell text-body-secondary">
          {p.id}
        </CTableDataCell>
        <CTableDataCell>
          <StatusBadge config={TYPE_CONFIG} value={p.type} />
        </CTableDataCell>
        <CTableDataCell className="text-nowrap">
          <strong>{p.code}</strong>
        </CTableDataCell>
        <CTableDataCell>{p.name}</CTableDataCell>
        <PriceCell product={p} />
        <PriceCell product={p} withTax />
        <CTableDataCell>{statusBadge}</CTableDataCell>
        {actions}
      </CTableRow>
    )
  }

  const colSpan = singleType === 'board' ? 9 : singleType === 'edge_banding' ? 11 : 8

  // Two different dead ends: an empty catalog is a fact, an over-narrow filter is a place the user
  // needs a way out of. Shared by the table and the phone's card list.
  const emptyState = isFiltered ? (
    <EmptyState
      icon="clearFilters"
      title="Ningún producto coincide con los filtros."
      action={
        <CButton color="secondary" variant="outline" onClick={handleClear}>
          Limpiar filtros
        </CButton>
      }
    />
  ) : (
    <EmptyState title="Aún no hay productos." />
  )

  return (
    <>
      <div className="surface">
        <ListToolbar>
          <SearchInput
            value={search}
            // `replace`: one history entry per settled keystroke would bury the page behind the list.
            onChange={(value) => setParam('q', value, { replace: true })}
            placeholder="Buscar por código o nombre…"
          />
          <ProductsFilters
            values={values}
            search={search}
            onChange={handleChange}
            onApply={handleApply}
            onClear={handleClear}
          />
          <div className="d-flex gap-2 ms-auto">
            {/* The seller syncs but doesn't edit: pulling fresh prices is part of
                quoting (it's the pass that loads Precio 2/3), editing the catalog
                is the admin's. Backed by `products:sync` vs `products:write`. */}
            <CButton color="secondary" variant="outline" onClick={() => setSyncModal(true)}>
              <Icon name="sync" className="me-1" />
              Sincronizar<span className="d-none d-md-inline"> catálogo</span>
            </CButton>
            {!isReadOnly && (
              <CButton color="primary" onClick={openCreate}>
                <Icon name="add" className="me-1" />
                Nuevo producto
              </CButton>
            )}
          </div>
        </ListToolbar>

        <FilterChips chips={chips} onClearAll={handleClear} />

        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          {/* Both views are mounted and the breakpoint picks one. On a phone the eight to eleven
              columns scrolled sideways and left the price, what a seller opens the catalog for, off
              the screen. A vendedor's card opens nothing: there is no editor for that role. */}
          <div className="d-md-none">
            {products.length === 0 ? (
              emptyState
            ) : (
              <div className="list-cards">
                {products.map((p) => (
                  <ListCard
                    key={p.id}
                    onClick={isReadOnly ? undefined : () => openEdit(p)}
                    title={p.code}
                    badges={
                      <>
                        <StatusBadge config={TYPE_CONFIG} value={p.type} />
                        {/* Only the exception: «Activo» on every row of a catalog says nothing. */}
                        {!p.isActive && <ActiveBadge active={false} />}
                      </>
                    }
                    amount={fmtMoney(p.price)}
                    meta={<ProductFacts product={p} />}
                    action={deleteButton(p)}
                  >
                    <div className="mt-1">{p.name}</div>
                  </ListCard>
                ))}
              </div>
            )}
          </div>

          <div className="d-none d-md-block">
            {/* A vendedor has no editor to open, and a hand cursor promising one would be a lie. */}
            <CTable
              align="middle"
              hover
              responsive
              className={`list-table${isReadOnly ? ' rows-static' : ''}`}
            >
              <CTableHead>
                <CTableRow>{renderHeaders()}</CTableRow>
              </CTableHead>
              <CTableBody>
                {products.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={colSpan} className="p-0">
                      {emptyState}
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  products.map(renderRow)
                )}
              </CTableBody>
            </CTable>
          </div>
        </QueryState>

        <Pagination
          offset={offset}
          limit={limit}
          total={pagination?.total}
          onChange={setOffset}
          onLimitChange={setLimit}
        />
      </div>

      <Modal
        visible={formModal.visible}
        onClose={closeForm}
        backdrop="static"
        size="lg"
        scrollable
        fullscreen="md"
      >
        <CModalHeader>
          <ModalTitle>{formModal.product ? 'Editar producto' : 'Nuevo producto'}</ModalTitle>
        </CModalHeader>
        <ProductForm
          key={formModal.product?.id ?? 'new'}
          product={formModal.product}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={isSubmitting}
          error={formError}
        />
      </Modal>

      <ConfirmDialog
        visible={deleteModal.visible}
        title="Eliminar producto"
        confirmLabel="Eliminar"
        tone="danger"
        onClose={closeDelete}
        onConfirm={handleDelete}
        pending={deleteMutation.isPending}
      >
        ¿Eliminar <strong>{deleteModal.product?.name}</strong> ({deleteModal.product?.code})? Esta
        acción no se puede deshacer.
      </ConfirmDialog>

      <SyncCatalogModal
        visible={syncModal}
        onClose={() => setSyncModal(false)}
        onSynced={() => void queryClient.invalidateQueries({ queryKey: ['products'] })}
      />
    </>
  )
}

export default ProductsPage
