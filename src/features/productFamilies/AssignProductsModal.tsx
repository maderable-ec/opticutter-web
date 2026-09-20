import { useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CFormCheck,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import { apiErrorMessage } from 'src/shared/api/errors'
import SearchInput from 'src/shared/components/SearchInput'
import QueryState from 'src/shared/components/QueryState'
import { useProducts } from 'src/features/products/useProducts'
import { subtypeLabel, subtypeOptionsFor } from 'src/features/products/productSubtypes'
import type { Product, ProductType } from 'src/features/products/types'
import { useAssignFamily } from './useProductFamilies'
import type { ProductFamily } from './types'

interface AssignProductsModalProps {
  family: ProductFamily
  visible: boolean
  onClose: () => void
}

const TYPE_LABEL: Record<ProductType, string> = {
  board: 'Tablero',
  edge_banding: 'Tapacanto',
}

// One page, but a generous one: the filters below are what narrows the list, and
// the footer always says how many matched so nothing is hidden in silence.
const PAGE = 100

type Scope = 'unassigned' | 'all'

/** Adds products to a family, in bulk.
 *
 *  Two things this screen has to make evident, because the data hides them:
 *  every tapacanto already belongs to a design, so the unassigned queue is all
 *  boards today and looks like a board-only feature; and the queue is long
 *  enough (76 products) that an unpaged list silently drops the tail. Hence the
 *  type counts, always shown even at zero, and the match total in the footer. */
const AssignProductsModal = ({ family, visible, onClose }: AssignProductsModalProps) => {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<ProductType | ''>('')
  const [subtype, setSubtype] = useState('')
  const [scope, setScope] = useState<Scope>('unassigned')
  const [selected, setSelected] = useState<Map<string, Product>>(new Map())
  const assign = useAssignFamily()

  const baseParams = {
    search: search || undefined,
    subtype: subtype ? [subtype] : undefined,
    // 'unassigned' is the working queue; 'all' is how a product is MOVED here
    // from another design — the substitution case (a tape discontinued, a colour
    // close enough), which is otherwise one product at a time from its own form.
    unassigned: scope === 'unassigned' ? true : undefined,
    limit: PAGE,
  }

  const { data, isLoading, isError, refetch } = useProducts({
    ...baseParams,
    type: type ? [type] : undefined,
  })
  // Counts per type under the SAME filters, so the tabs say how many a click
  // would actually show instead of advertising an empty tab.
  const boards = useProducts({ ...baseParams, type: ['board'], limit: 1 })
  const bandings = useProducts({ ...baseParams, type: ['edge_banding'], limit: 1 })

  const products = data?.items ?? []
  const total = data?.pagination?.total ?? 0
  const boardCount = boards.data?.pagination?.total ?? 0
  const bandingCount = bandings.data?.pagination?.total ?? 0

  const subtypeOptions = useMemo(() => subtypeOptionsFor(type ? [type] : []), [type])
  // Preserves the helper's own grouping (it only labels groups when both types
  // are in play) without re-deciding here what belongs to which type.
  const groupedSubtypes = useMemo(() => {
    const groups = new Map<string | undefined, typeof subtypeOptions>()
    for (const option of subtypeOptions) {
      const bucket = groups.get(option.group) ?? []
      bucket.push(option)
      groups.set(option.group, bucket)
    }
    return [...groups.entries()]
  }, [subtypeOptions])

  const setTypeAndPrune = (next: ProductType | '') => {
    setType(next)
    // A subtype belongs to one type; keeping it across the switch guarantees an
    // empty list and looks like a bug in the filter.
    setSubtype('')
  }

  const toggle = (product: Product) =>
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(product.id)) next.delete(product.id)
      else next.set(product.id, product)
      return next
    })

  const close = () => {
    setSelected(new Map())
    setSearch('')
    setType('')
    setSubtype('')
    setScope('unassigned')
    assign.reset()
    onClose()
  }

  const handleAssign = () =>
    assign.mutate({ familyId: family.id, productIds: [...selected.keys()] }, { onSuccess: close })

  // Selected rows survive a filter change (the Map keeps the product, not just
  // the id), so narrowing the search never silently drops part of the batch.
  const movedFromAnother = [...selected.values()].filter(
    (p) => p.familyId != null && p.familyId !== family.id,
  ).length

  return (
    <CModal visible={visible} onClose={close} size="lg" backdrop="static" scrollable>
      <CModalHeader>
        <CModalTitle>Asignar productos a «{family.name}»</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {assign.error && <CAlert color="danger">{apiErrorMessage(assign.error)}</CAlert>}

        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <CButtonGroup size="sm">
            <CButton
              color="primary"
              variant={type === '' ? undefined : 'outline'}
              onClick={() => setTypeAndPrune('')}
            >
              Todos ({boardCount + bandingCount})
            </CButton>
            <CButton
              color="primary"
              variant={type === 'board' ? undefined : 'outline'}
              onClick={() => setTypeAndPrune('board')}
            >
              Tableros ({boardCount})
            </CButton>
            <CButton
              color="primary"
              variant={type === 'edge_banding' ? undefined : 'outline'}
              onClick={() => setTypeAndPrune('edge_banding')}
            >
              Tapacantos ({bandingCount})
            </CButton>
          </CButtonGroup>

          <CFormSelect
            size="sm"
            style={{ maxWidth: 200 }}
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            aria-label="Subtipo"
          >
            <option value="">Todos los subtipos</option>
            {/* With no type chosen the helper returns BOTH groups, and a flat list
                mixing MDP with Canto Maderado reads as noise — so the groups it
                labels are rendered as optgroups rather than dropped. */}
            {groupedSubtypes.map(([group, options]) =>
              group ? (
                <optgroup key={group} label={group}>
                  {options.map((o) => (
                    <option key={String(o.value)} value={String(o.value)}>
                      {subtypeLabel(String(o.value))}
                    </option>
                  ))}
                </optgroup>
              ) : (
                options.map((o) => (
                  <option key={String(o.value)} value={String(o.value)}>
                    {subtypeLabel(String(o.value))}
                  </option>
                ))
              ),
            )}
          </CFormSelect>

          <CFormCheck
            className="ms-auto"
            id="assign-scope"
            label="Incluir los que ya tienen familia"
            checked={scope === 'all'}
            onChange={(e) => setScope(e.target.checked ? 'all' : 'unassigned')}
          />
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código o nombre…"
          className="mb-2"
        />

        <p className="small text-body-secondary">
          {scope === 'unassigned'
            ? 'Solo los productos que todavía no pertenecen a ninguna familia. Hoy los tapacantos ya están todos asignados, por eso la lista suele ser de tableros.'
            : 'Todo el catálogo. Asignar uno que ya tiene familia lo MUEVE a esta.'}
        </p>

        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          {products.length === 0 ? (
            <div className="text-center text-body-secondary py-4">
              Ningún producto coincide con estos filtros.
            </div>
          ) : (
            <div className="d-flex flex-column gap-1">
              {products.map((p: Product) => (
                <CFormCheck
                  key={p.id}
                  id={`assign-${p.id}`}
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p)}
                  label={
                    <span>
                      <CBadge color="secondary" className="me-2">
                        {TYPE_LABEL[p.type]}
                      </CBadge>
                      <span className="fw-semibold me-2">{p.code}</span>
                      {p.name}
                      {p.family && (
                        <CBadge
                          color={p.family.id === family.id ? 'success' : 'warning'}
                          className="ms-2"
                        >
                          {p.family.id === family.id ? 'ya en esta' : p.family.name}
                        </CBadge>
                      )}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </QueryState>
      </CModalBody>
      <CModalFooter className="justify-content-between">
        <span className="small text-body-secondary">
          {products.length < total
            ? `Mostrando ${products.length} de ${total} — afiná los filtros para ver el resto`
            : `${total} ${total === 1 ? 'producto' : 'productos'}`}
          {selected.size > 0 && ` · ${selected.size} seleccionados`}
          {movedFromAnother > 0 && ` (${movedFromAnother} cambian de familia)`}
        </span>
        <span>
          <CButton
            color="secondary"
            variant="ghost"
            onClick={close}
            disabled={assign.isPending}
            className="me-2"
          >
            Cancelar
          </CButton>
          <CButton
            color="primary"
            onClick={handleAssign}
            disabled={selected.size === 0 || assign.isPending}
          >
            {assign.isPending && <CSpinner size="sm" className="me-1" />}
            Asignar {selected.size > 0 ? selected.size : ''}
          </CButton>
        </span>
      </CModalFooter>
    </CModal>
  )
}

export default AssignProductsModal
