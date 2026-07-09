import { useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowBottom, cilArrowTop, cilCheckAlt, cilSave } from '@coreui/icons'

import FieldError from 'src/shared/components/FieldError'
import { fieldErrorsFromApiError, hasGenericError } from 'src/shared/api/errors'
import { usePriceTiers, useUpdatePriceTiers } from './usePriceTiers'
import { useSavedFlash } from './useSavedFlash'
import type { PriceTier } from './types'

interface TierRow extends PriceTier {
  rateInput: string // edited as percentage string
}

const clean = (n: number) => Math.round(n * 1e6) / 1e6
const toRow = (t: PriceTier): TierRow => ({
  ...t,
  rateInput: String(clean(t.rate * 100)),
})
const toTier = (r: TierRow, i: number): PriceTier => ({
  code: r.code,
  name: r.name,
  rate: clean((parseFloat(r.rateInput) || 0) / 100),
  isActive: r.isActive,
  sortOrder: i + 1,
})

const PriceTiersSettingsCard = () => {
  const { data, isLoading, isError, refetch } = usePriceTiers()
  const update = useUpdatePriceTiers()
  const [savedFlash, flashSaved] = useSavedFlash()

  const [rows, setRows] = useState<TierRow[] | null>(null)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  const [seenData, setSeenData] = useState<PriceTier[] | null>(null)
  if (data && data !== seenData) {
    setSeenData(data)
    setRows(data.map(toRow))
  }

  const updateRow = (code: string, patch: Partial<TierRow>) =>
    setRows((rs) => rs?.map((r) => (r.code === code ? { ...r, ...patch } : r)) ?? null)

  const move = (index: number, dir: -1 | 1) => {
    setRows((rs) => {
      if (!rs) return rs
      const target = index + dir
      if (target < 0 || target >= rs.length) return rs
      const next = [...rs]
      ;[next[index], next[target]] = [next[target]!, next[index]!]
      return next
    })
  }

  const isDirty =
    !!rows &&
    !!data &&
    JSON.stringify(rows.map(toTier)) !== JSON.stringify(data.map((t, i) => toTier(toRow(t), i)))

  const validate = (rs: TierRow[]): Record<string, string> => {
    const errors: Record<string, string> = {}
    rs.forEach((r, i) => {
      const pct = parseFloat(r.rateInput)
      if (!r.name.trim()) errors[`tiers.${i}.name`] = 'El nombre es obligatorio.'
      if (!Number.isFinite(pct) || pct < 0 || pct > 100)
        errors[`tiers.${i}.rate`] = 'Porcentaje entre 0 y 100.'
    })
    return errors
  }

  const handleSave = () => {
    if (!rows) return
    const errors = validate(rows)
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors)
      return
    }
    setClientErrors({})
    update.mutate({ priceTiers: rows.map(toTier) }, { onSuccess: () => flashSaved() })
  }

  const handleDiscard = () => {
    if (data) setRows(data.map(toRow))
    setClientErrors({})
    update.reset()
  }

  const serverErrors = fieldErrorsFromApiError(update.error)
  const fieldErrors = { ...serverErrors, ...clientErrors }
  const genericError = hasGenericError(update.error, serverErrors)

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <strong>Niveles de precio</strong>
        <div className="d-flex gap-2">
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            type="button"
            disabled={!isDirty || update.isPending}
            onClick={handleDiscard}
          >
            Descartar
          </CButton>
          <CButton
            color="primary"
            size="sm"
            type="button"
            disabled={!isDirty || update.isPending}
            onClick={handleSave}
          >
            {update.isPending ? (
              <CSpinner size="sm" className="me-1" />
            ) : (
              <CIcon icon={savedFlash ? cilCheckAlt : cilSave} className="me-1" />
            )}
            {savedFlash ? 'Guardado' : 'Guardar'}
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        {isLoading || !rows ? (
          <div className="text-center py-5">
            {isError ? (
              <div className="text-body-secondary">
                No se pudieron cargar los niveles.{' '}
                <CButton size="sm" color="link" onClick={() => void refetch()}>
                  Reintentar
                </CButton>
              </div>
            ) : (
              <CSpinner color="primary" />
            )}
          </div>
        ) : (
          <>
            <p className="text-body-secondary small mb-3">
              El descuento se aplica a tableros de catálogo a nivel documento. El nivel "consumidor"
              (0 %) es el default cuando no se selecciona ninguno.
            </p>

            {savedFlash && (
              <CAlert color="success" className="py-2">
                Niveles de precio guardados correctamente.
              </CAlert>
            )}
            {genericError && (
              <CAlert color="danger" className="py-2">
                {update.error?.message || 'Error al guardar. Intenta nuevamente.'}
              </CAlert>
            )}

            {rows.map((r, i) => (
              <div className="border rounded p-2 mb-2" key={r.code}>
                <CRow className="g-2 align-items-end">
                  <CCol xs={12} md={1}>
                    <div className="text-body-secondary small mb-1">Código</div>
                    <div className="font-monospace small">{r.code}</div>
                  </CCol>
                  <CCol xs={12} md={4}>
                    <CFormLabel className="small mb-1">Nombre</CFormLabel>
                    <CFormInput
                      size="sm"
                      value={r.name}
                      maxLength={128}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateRow(r.code, { name: e.target.value })
                      }
                      invalid={!!fieldErrors[`tiers.${i}.name`]}
                    />
                    <FieldError name={`tiers.${i}.name`} errors={fieldErrors} />
                  </CCol>
                  <CCol xs={6} md={2}>
                    <CFormLabel className="small mb-1">Descuento</CFormLabel>
                    <CInputGroup size="sm">
                      <CFormInput
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        value={r.rateInput}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          updateRow(r.code, { rateInput: e.target.value })
                        }
                        invalid={!!fieldErrors[`tiers.${i}.rate`]}
                      />
                      <CInputGroupText>%</CInputGroupText>
                    </CInputGroup>
                    <FieldError name={`tiers.${i}.rate`} errors={fieldErrors} />
                  </CCol>
                  <CCol xs={6} md={2} className="d-flex align-items-end pb-1">
                    <CFormCheck
                      label="Activo"
                      checked={r.isActive}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateRow(r.code, { isActive: e.target.checked })
                      }
                    />
                  </CCol>
                  <CCol xs={12} md={3} className="d-flex gap-1 justify-content-end">
                    <CButton
                      size="sm"
                      variant="ghost"
                      color="secondary"
                      type="button"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      title="Subir"
                    >
                      <CIcon icon={cilArrowTop} />
                    </CButton>
                    <CButton
                      size="sm"
                      variant="ghost"
                      color="secondary"
                      type="button"
                      disabled={i === rows.length - 1}
                      onClick={() => move(i, 1)}
                      title="Bajar"
                    >
                      <CIcon icon={cilArrowBottom} />
                    </CButton>
                  </CCol>
                </CRow>
              </div>
            ))}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default PriceTiersSettingsCard
