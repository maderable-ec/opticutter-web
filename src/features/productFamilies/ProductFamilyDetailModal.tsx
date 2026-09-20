import { useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import QueryState from 'src/shared/components/QueryState'
import { apiErrorMessage } from 'src/shared/api/errors'
import type { Product } from 'src/features/products/types'
import { useAssignFamily, useProductFamily, useSetFamilyAlias } from './useProductFamilies'
import { familyIssues } from './types'

interface ProductFamilyDetailModalProps {
  familyId: number | null
  onClose: () => void
  onAssign: () => void
  canEdit: boolean
}

const BoardTable = ({
  products,
  onRemove,
  canEdit,
}: {
  products: Product[]
  onRemove: (id: string) => void
  canEdit: boolean
}) => (
  <>
    <h6 className="mt-3">
      Tableros <CBadge color="secondary">{products.length}</CBadge>
    </h6>
    {products.length === 0 ? (
      <p className="text-body-secondary small mb-0">
        Ningún tablero coordina con este diseño todavía.
      </p>
    ) : (
      <CTable small align="middle" responsive className="mb-0">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Código</CTableHeaderCell>
            <CTableHeaderCell>Nombre</CTableHeaderCell>
            <CTableHeaderCell>Grosor</CTableHeaderCell>
            {canEdit && <CTableHeaderCell />}
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {products.map((p) => (
            <CTableRow key={p.id}>
              <CTableDataCell className="fw-semibold">{p.code}</CTableDataCell>
              <CTableDataCell>{p.name}</CTableDataCell>
              <CTableDataCell className="text-nowrap">
                {p.attributes.thickness ?? '—'} mm
              </CTableDataCell>
              {canEdit && (
                <CTableDataCell className="text-end">
                  <CButton
                    color="link"
                    size="sm"
                    className="text-danger p-0"
                    onClick={() => onRemove(p.id)}
                  >
                    Quitar
                  </CButton>
                </CTableDataCell>
              )}
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>
    )}
  </>
)

const ProductFamilyDetailModal = ({
  familyId,
  onClose,
  onAssign,
  canEdit,
}: ProductFamilyDetailModalProps) => {
  const { data, isLoading, isError, refetch } = useProductFamily(familyId)
  const assign = useAssignFamily()
  const setAlias = useSetFamilyAlias()

  // Draft codes, keyed by product. Local so the operator can fill several rows
  // (or accept the suggestion below) and commit them in one move, which is also
  // what keeps the write all-or-nothing per value.
  // The parent keys this component on the family, so opening a different one
  // remounts it and the draft starts empty. That is the React idiom for state
  // that belongs to a prop; resetting it from an effect trips
  // `react-hooks/set-state-in-effect` and costs a cascading render.
  const [draft, setDraft] = useState<Record<string, string>>({})

  const tapes = useMemo(() => data?.edgeBandings ?? [], [data])
  const aliasOf = (p: Product) => draft[p.id] ?? p.alias ?? ''
  const missing = tapes.filter((p) => !aliasOf(p).trim())
  // The code to propose: only when the family already speaks with ONE voice.
  // Suggesting one while two are in play would be picking a side silently.
  const known = [...new Set(tapes.map((p) => (p.alias ?? '').trim()).filter(Boolean))]
  const suggestion = known.length === 1 ? known[0] : null

  const changed = tapes.filter((p) => aliasOf(p).trim() && aliasOf(p).trim() !== (p.alias ?? ''))

  const remove = (productId: string) => assign.mutate({ familyId: null, productIds: [productId] })

  const save = () => {
    if (!data || changed.length === 0) return
    // Grouped by value: the endpoint stamps ONE code onto many tapes, so editing
    // two rows to two different codes is two calls, each atomic on its own.
    const byAlias = new Map<string, string[]>()
    for (const p of changed) {
      const value = aliasOf(p).trim()
      byAlias.set(value, [...(byAlias.get(value) ?? []), p.id])
    }
    for (const [alias, productIds] of byAlias) {
      setAlias.mutate({ familyId: data.id, alias, productIds })
    }
    setDraft({})
  }

  return (
    <CModal visible={familyId !== null} onClose={onClose} size="lg" scrollable>
      <CModalHeader>
        <CModalTitle>{data?.name ?? 'Familia'}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <QueryState isLoading={isLoading} isError={isError} onRetry={() => void refetch()}>
          {data && (
            <>
              {data.description && <p className="text-body-secondary">{data.description}</p>}

              {familyIssues(data).length > 0 && (
                <div className="mb-3 d-flex flex-wrap gap-1">
                  {familyIssues(data).map((issue) => (
                    <CBadge key={issue} color="warning">
                      {issue}
                    </CBadge>
                  ))}
                </div>
              )}

              {setAlias.error && <CAlert color="danger">{apiErrorMessage(setAlias.error)}</CAlert>}

              <BoardTable products={data.boards} onRemove={remove} canEdit={canEdit} />

              <h6 className="mt-3">
                Tapacantos <CBadge color="secondary">{tapes.length}</CBadge>
              </h6>

              {canEdit && missing.length > 0 && (
                <CAlert color="warning" className="py-2 small d-flex align-items-center gap-2">
                  <span>
                    {missing.length === 1
                      ? 'Un tapacanto sin alias: la notación del taller no lo distingue de otro diseño.'
                      : `${missing.length} tapacantos sin alias: la notación del taller no los distingue de otro diseño.`}
                  </span>
                  {suggestion && (
                    <CButton
                      color="warning"
                      size="sm"
                      variant="outline"
                      className="ms-auto text-nowrap"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          ...Object.fromEntries(missing.map((p) => [p.id, suggestion])),
                        }))
                      }
                    >
                      Usar «{suggestion}» en{' '}
                      {missing.length === 1 ? 'el que falta' : 'los que faltan'}
                    </CButton>
                  )}
                </CAlert>
              )}

              {tapes.length === 0 ? (
                <p className="text-body-secondary small mb-0">
                  Sin tapacanto: el selector de estos tableros sale vacío.
                </p>
              ) : (
                <CTable small align="middle" responsive className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Código</CTableHeaderCell>
                      <CTableHeaderCell>Nombre</CTableHeaderCell>
                      <CTableHeaderCell>Medida</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 130 }}>Alias</CTableHeaderCell>
                      {canEdit && <CTableHeaderCell />}
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {tapes.map((p) => {
                      const value = aliasOf(p)
                      return (
                        <CTableRow key={p.id} color={!value.trim() ? 'warning' : undefined}>
                          <CTableDataCell className="fw-semibold">{p.code}</CTableDataCell>
                          <CTableDataCell>{p.name}</CTableDataCell>
                          <CTableDataCell className="text-nowrap">
                            {p.attributes.width ?? '—'}×{p.attributes.thickness ?? '—'} mm
                          </CTableDataCell>
                          <CTableDataCell>
                            {canEdit ? (
                              <CFormInput
                                size="sm"
                                value={value}
                                maxLength={20}
                                placeholder="sin alias"
                                onChange={(e) =>
                                  setDraft((d) => ({ ...d, [p.id]: e.target.value }))
                                }
                                aria-label={`Alias de ${p.code}`}
                              />
                            ) : (
                              (p.alias ?? '—')
                            )}
                          </CTableDataCell>
                          {canEdit && (
                            <CTableDataCell className="text-end">
                              <CButton
                                color="link"
                                size="sm"
                                className="text-danger p-0"
                                onClick={() => remove(p.id)}
                              >
                                Quitar
                              </CButton>
                            </CTableDataCell>
                          )}
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              )}
            </>
          )}
        </QueryState>
      </CModalBody>
      <CModalFooter className="justify-content-between">
        <span className="small text-body-secondary">
          {changed.length > 0 &&
            `${changed.length} ${changed.length === 1 ? 'alias por guardar' : 'alias por guardar'}`}
        </span>
        <span>
          {canEdit && (
            <>
              <CButton color="primary" variant="outline" className="me-2" onClick={onAssign}>
                Asignar productos
              </CButton>
              <CButton
                color="primary"
                className="me-2"
                onClick={save}
                disabled={changed.length === 0 || setAlias.isPending}
              >
                {setAlias.isPending && <CSpinner size="sm" className="me-1" />}
                Guardar alias
              </CButton>
            </>
          )}
          <CButton color="secondary" variant="ghost" onClick={onClose}>
            Cerrar
          </CButton>
        </span>
      </CModalFooter>
    </CModal>
  )
}

export default ProductFamilyDetailModal
