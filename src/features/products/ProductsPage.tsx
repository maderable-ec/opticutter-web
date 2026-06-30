import type {
  BoardAttributes,
  EdgeBandingAttributes,
  Product,
  ProductListParams,
  ProductPayload,
  ProductType,
} from './types'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { cilCloudUpload, cilPencil, cilPlus, cilSearch, cilTrash } from '@coreui/icons'
import { useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct } from './useProducts'
import { useEffect, useState } from 'react'

import CIcon from '@coreui/icons-react'
import ImportProductsModal from './ImportProductsModal'
import ProductForm from './ProductForm'
import { useHasRole } from 'src/features/auth/useAuth'
import { useQueryClient } from '@tanstack/react-query'

const LIMIT = 20

const TYPE_LABELS: Record<string, string> = {
  board: 'Tablero',
  edge_banding: 'Tapacanto',
  hardware: 'Herraje',
}
const TYPE_COLORS: Record<string, string> = {
  board: 'info',
  edge_banding: 'warning',
  hardware: 'secondary',
}
const BAND_TYPE_LABELS: Record<string, string> = { Soft: 'Suave', Hard: 'Duro' }

const fmtPrice = (n?: number) =>
  typeof n === 'number' ? n.toLocaleString('es-EC', { style: 'currency', currency: 'ARS' }) : '—'

interface ProductModalState {
  visible: boolean
  product: Product | null
}

const ProductsPage = () => {
  const isReadOnly = useHasRole('vendedor')
  const queryClient = useQueryClient()
  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ProductType | ''>('')
  const [offset, setOffset] = useState(0)
  const [formModal, setFormModal] = useState<ProductModalState>({ visible: false, product: null })
  const [deleteModal, setDeleteModal] = useState<ProductModalState>({
    visible: false,
    product: null,
  })
  const [importModal, setImportModal] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(rawSearch)
      setOffset(0)
    }, 350)
    return () => clearTimeout(t)
  }, [rawSearch])

  const queryParams: ProductListParams = { search, offset, limit: LIMIT }
  if (typeFilter) queryParams.type = typeFilter

  const { data: productsData, isLoading } = useProducts(queryParams)
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
  const showPrev = offset > 0
  const showNext = pagination ? offset + LIMIT < pagination.total : false

  const renderHeaders = () => {
    if (typeFilter === 'board') {
      return (
        <>
          <CTableHeaderCell className="bg-body-tertiary">ID</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Código</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Nombre</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Precio</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Dimensiones</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Grosor</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Estado</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary" />
        </>
      )
    }
    if (typeFilter === 'edge_banding') {
      return (
        <>
          <CTableHeaderCell className="bg-body-tertiary">ID</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Código</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Nombre</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Precio</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Grosor</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Ancho</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Tipo</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Color</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary">Estado</CTableHeaderCell>
          <CTableHeaderCell className="bg-body-tertiary" />
        </>
      )
    }
    return (
      <>
        <CTableHeaderCell className="bg-body-tertiary">ID</CTableHeaderCell>
        <CTableHeaderCell className="bg-body-tertiary">Tipo</CTableHeaderCell>
        <CTableHeaderCell className="bg-body-tertiary">Código</CTableHeaderCell>
        <CTableHeaderCell className="bg-body-tertiary">Nombre</CTableHeaderCell>
        <CTableHeaderCell className="bg-body-tertiary">Precio</CTableHeaderCell>
        <CTableHeaderCell className="bg-body-tertiary">Estado</CTableHeaderCell>
        <CTableHeaderCell className="bg-body-tertiary" />
      </>
    )
  }

  const renderRow = (p: Product) => {
    const actions = (
      <CTableDataCell className="text-end text-nowrap">
        {!isReadOnly && (
          <>
            <CButton variant="ghost" color="secondary" size="sm" onClick={() => openEdit(p)}>
              <CIcon icon={cilPencil} />
            </CButton>
            <CButton
              variant="ghost"
              color="danger"
              size="sm"
              className="ms-1"
              onClick={() => openDelete(p)}
            >
              <CIcon icon={cilTrash} />
            </CButton>
          </>
        )}
      </CTableDataCell>
    )

    const statusBadge = (
      <CBadge color={p.isActive ? 'success' : 'secondary'}>
        {p.isActive ? 'Activo' : 'Inactivo'}
      </CBadge>
    )

    if (typeFilter === 'board') {
      const a = (p.attributes ?? {}) as BoardAttributes & EdgeBandingAttributes
      return (
        <CTableRow key={p.id}>
          <CTableDataCell className="text-body-secondary">{p.id}</CTableDataCell>
          <CTableDataCell>
            <strong>{p.code}</strong>
          </CTableDataCell>
          <CTableDataCell>{p.name}</CTableDataCell>
          <CTableDataCell>{fmtPrice(p.price)}</CTableDataCell>
          <CTableDataCell>
            {a.height && a.width ? `${a.height} × ${a.width} mm` : '—'}
          </CTableDataCell>
          <CTableDataCell>{a.thickness ? `${a.thickness} mm` : '—'}</CTableDataCell>
          <CTableDataCell>{statusBadge}</CTableDataCell>
          {actions}
        </CTableRow>
      )
    }

    if (typeFilter === 'edge_banding') {
      const a = (p.attributes ?? {}) as BoardAttributes & EdgeBandingAttributes
      return (
        <CTableRow key={p.id}>
          <CTableDataCell className="text-body-secondary">{p.id}</CTableDataCell>
          <CTableDataCell>
            <strong>{p.code}</strong>
          </CTableDataCell>
          <CTableDataCell>{p.name}</CTableDataCell>
          <CTableDataCell>{fmtPrice(p.price)}</CTableDataCell>
          <CTableDataCell>{a.thickness != null ? `${a.thickness} mm` : '—'}</CTableDataCell>
          <CTableDataCell>{a.width ? `${a.width} mm` : '—'}</CTableDataCell>
          <CTableDataCell>
            {a.bandType ? (BAND_TYPE_LABELS[a.bandType] ?? a.bandType) : '—'}
          </CTableDataCell>
          <CTableDataCell>{a.color ?? '—'}</CTableDataCell>
          <CTableDataCell>{statusBadge}</CTableDataCell>
          {actions}
        </CTableRow>
      )
    }

    return (
      <CTableRow key={p.id}>
        <CTableDataCell className="text-body-secondary">{p.id}</CTableDataCell>
        <CTableDataCell>
          <CBadge color={TYPE_COLORS[p.type] ?? 'secondary'}>
            {TYPE_LABELS[p.type] ?? p.type}
          </CBadge>
        </CTableDataCell>
        <CTableDataCell>
          <strong>{p.code}</strong>
        </CTableDataCell>
        <CTableDataCell>{p.name}</CTableDataCell>
        <CTableDataCell>{fmtPrice(p.price)}</CTableDataCell>
        <CTableDataCell>{statusBadge}</CTableDataCell>
        {actions}
      </CTableRow>
    )
  }

  const colSpan = typeFilter === 'board' ? 8 : typeFilter === 'edge_banding' ? 10 : 7

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Productos</strong>
          {!isReadOnly && (
            <div className="d-flex gap-2">
              <CButton color="secondary" variant="outline" size="sm" onClick={() => setImportModal(true)}>
                <CIcon icon={cilCloudUpload} className="me-1" />
                Importar CSV
              </CButton>
              <CButton color="primary" size="sm" onClick={openCreate}>
                <CIcon icon={cilPlus} className="me-1" />
                Nuevo producto
              </CButton>
            </div>
          )}
        </CCardHeader>
        <CCardBody>
          <CRow className="mb-3 g-2">
            <CCol xs={12} sm="auto">
              <CFormSelect
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as ProductType | '')
                  setOffset(0)
                }}
                style={{ minWidth: 160 }}
              >
                <option value="">Todos los tipos</option>
                <option value="board">Tablero</option>
                <option value="edge_banding">Tapacanto</option>
              </CFormSelect>
            </CCol>
            <CCol xs={12} sm>
              <CInputGroup style={{ maxWidth: 360 }}>
                <CInputGroupText>
                  <CIcon icon={cilSearch} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Buscar por código o nombre…"
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                />
              </CInputGroup>
            </CCol>
          </CRow>

          {isLoading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : (
            <CTable align="middle" hover responsive>
              <CTableHead>
                <CTableRow>{renderHeaders()}</CTableRow>
              </CTableHead>
              <CTableBody>
                {products.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell
                      colSpan={colSpan}
                      className="text-center text-body-secondary py-5"
                    >
                      Sin resultados
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  products.map(renderRow)
                )}
              </CTableBody>
            </CTable>
          )}

          {(showPrev || showNext) && (
            <div className="d-flex justify-content-end gap-2 mt-2">
              <CButton
                size="sm"
                color="secondary"
                disabled={!showPrev}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              >
                Anterior
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                disabled={!showNext}
                onClick={() => setOffset(offset + LIMIT)}
              >
                Siguiente
              </CButton>
            </div>
          )}
        </CCardBody>
      </CCard>

      <CModal
        visible={formModal.visible}
        onClose={closeForm}
        backdrop="static"
        size="lg"
        scrollable
      >
        <CModalHeader>
          <CModalTitle>{formModal.product ? 'Editar producto' : 'Nuevo producto'}</CModalTitle>
        </CModalHeader>
        <ProductForm
          key={formModal.product?.id ?? 'new'}
          product={formModal.product}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={isSubmitting}
          error={formError}
        />
      </CModal>

      <CModal visible={deleteModal.visible} onClose={closeDelete}>
        <CModalHeader>
          <CModalTitle>Eliminar producto</CModalTitle>
        </CModalHeader>
        <CModalBody>
          ¿Eliminar <strong>{deleteModal.product?.name}</strong> ({deleteModal.product?.code})? Esta
          acción no se puede deshacer.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeDelete}>
            Cancelar
          </CButton>
          <CButton color="danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <CSpinner size="sm" /> : 'Eliminar'}
          </CButton>
        </CModalFooter>
      </CModal>

      <ImportProductsModal
        visible={importModal}
        onClose={() => setImportModal(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
      />
    </>
  )
}

export default ProductsPage
