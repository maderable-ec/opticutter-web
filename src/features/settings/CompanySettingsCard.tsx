import { useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowBottom, cilArrowTop, cilCheckAlt, cilPlus, cilSave, cilTrash } from '@coreui/icons'

import FieldError from 'src/shared/components/FieldError'
import { fieldErrorsFromApiError, hasGenericError } from 'src/shared/api/errors'
import { useCompanySettings, useUpdateCompanySettings } from './useSettings'
import { useSavedFlash } from './useSavedFlash'
import type { Branch, CompanyPayload, CompanySettings } from './types'

const TEXT_FIELDS = [
  { key: 'name', label: 'Nombre', max: 128, type: 'text', placeholder: 'Razón social', col: 6 },
  {
    key: 'email',
    label: 'Email',
    max: 128,
    type: 'email',
    placeholder: 'correo@empresa.com',
    col: 6,
  },
  {
    key: 'tagline',
    label: 'Eslogan',
    max: 256,
    type: 'text',
    placeholder: 'Eslogan de la empresa',
    col: 12,
  },
  {
    key: 'phone',
    label: 'Teléfono(s)',
    max: 128,
    type: 'text',
    placeholder: '0990000000 / 0990000001',
    col: 12,
  },
] as const

type TextKey = (typeof TEXT_FIELDS)[number]['key']

interface BranchRow extends Branch {
  uid: string
}

interface FormState {
  name: string
  tagline: string
  email: string
  phone: string
  branches: BranchRow[]
}

let seq = 0
const newUid = () => `br-${++seq}`

const toForm = (s: CompanySettings): FormState => ({
  name: s.name,
  tagline: s.tagline,
  email: s.email,
  phone: s.phone,
  branches: s.branches.map((b) => ({ uid: newUid(), name: b.name, address: b.address })),
})

const stripBranches = (rows: BranchRow[]): Branch[] =>
  rows.map((b) => ({ name: b.name.trim(), address: b.address.trim() }))

const CompanySettingsCard = () => {
  const { data, isLoading, isError, refetch } = useCompanySettings()
  const update = useUpdateCompanySettings()
  const [savedFlash, flashSaved] = useSavedFlash()

  const [form, setForm] = useState<FormState | null>(null)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  // Sync the form to server truth on initial load and after each successful PATCH,
  // using the "adjust state during render" pattern (avoids a setState-in-effect).
  const [seenData, setSeenData] = useState<CompanySettings | null>(null)
  if (data && data !== seenData) {
    setSeenData(data)
    setForm(toForm(data))
  }

  const clearError = (key: string) =>
    setClientErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })

  const clearBranchErrors = () =>
    setClientErrors((prev) => {
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) if (!k.startsWith('branches.')) next[k] = v
      return next
    })

  const onChangeText = (key: TextKey) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setForm((f) => (f ? { ...f, [key]: value } : f))
    clearError(key)
  }

  const addBranch = () => {
    setForm((f) =>
      f ? { ...f, branches: [...f.branches, { uid: newUid(), name: '', address: '' }] } : f,
    )
  }
  const removeBranch = (uid: string) => {
    setForm((f) => (f ? { ...f, branches: f.branches.filter((b) => b.uid !== uid) } : f))
    clearBranchErrors()
  }
  const updateBranch =
    (uid: string, field: 'name' | 'address') => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setForm((f) =>
        f
          ? {
              ...f,
              branches: f.branches.map((b) => (b.uid === uid ? { ...b, [field]: value } : b)),
            }
          : f,
      )
      clearBranchErrors()
    }
  const moveBranch = (index: number, dir: -1 | 1) => {
    setForm((f) => {
      if (!f) return f
      const target = index + dir
      if (target < 0 || target >= f.branches.length) return f
      const branches = [...f.branches]
      const a = branches[index]
      const b = branches[target]
      if (a === undefined || b === undefined) return f
      branches[index] = b
      branches[target] = a
      return { ...f, branches }
    })
    clearBranchErrors()
  }

  const branchesChanged =
    !!form &&
    !!data &&
    JSON.stringify(stripBranches(form.branches)) !== JSON.stringify(data.branches)

  const textChanged = !!form && !!data && TEXT_FIELDS.some(({ key }) => form[key] !== data[key])

  const isDirty = textChanged || branchesChanged

  const validate = (f: FormState): Record<string, string> => {
    const errors: Record<string, string> = {}
    for (const { key, label, max } of TEXT_FIELDS) {
      if (f[key].length > max) errors[key] = `${label} no puede superar ${max} caracteres.`
    }
    f.branches.forEach((b, i) => {
      const name = b.name.trim()
      const address = b.address.trim()
      if (!name) errors[`branches.${i}.name`] = 'El nombre es obligatorio.'
      else if (name.length > 128) errors[`branches.${i}.name`] = 'Máximo 128 caracteres.'
      if (!address) errors[`branches.${i}.address`] = 'La dirección es obligatoria.'
      else if (address.length > 256) errors[`branches.${i}.address`] = 'Máximo 256 caracteres.'
    })
    return errors
  }

  const handleSave = () => {
    if (!form || !data) return
    const errors = validate(form)
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors)
      return
    }
    const payload: CompanyPayload = {}
    for (const { key } of TEXT_FIELDS) {
      if (form[key] !== data[key]) payload[key] = form[key]
    }
    // Sending `branches` replaces the whole array (server contract), so send it complete.
    if (branchesChanged) payload.branches = stripBranches(form.branches)
    if (Object.keys(payload).length === 0) return
    setClientErrors({})
    update.mutate(payload, { onSuccess: () => flashSaved() })
  }

  const handleDiscard = () => {
    if (data) setForm(toForm(data))
    setClientErrors({})
    update.reset()
  }

  const serverErrors = fieldErrorsFromApiError(update.error)
  const fieldErrors = { ...serverErrors, ...clientErrors }
  const genericError = hasGenericError(update.error, serverErrors)

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <strong>Datos de la empresa</strong>
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
        {isLoading || !form ? (
          <div className="text-center py-5">
            {isError ? (
              <div className="text-body-secondary">
                No se pudieron cargar los datos.{' '}
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
              Estos datos forman el membrete de proformas y hojas de producción, y se reflejan en
              vivo en los PDF de pedidos existentes.
            </p>

            {savedFlash && (
              <CAlert color="success" className="py-2">
                Datos de la empresa guardados correctamente.
              </CAlert>
            )}
            {genericError && (
              <CAlert color="danger" className="py-2">
                {update.error?.message || 'Error al guardar. Intenta nuevamente.'}
              </CAlert>
            )}

            <CRow className="g-3">
              {TEXT_FIELDS.map(({ key, label, max, type, placeholder, col }) => (
                <CCol xs={12} md={col} key={key}>
                  <CFormLabel>{label}</CFormLabel>
                  <CFormInput
                    type={type}
                    value={form[key]}
                    maxLength={max}
                    placeholder={placeholder}
                    onChange={onChangeText(key)}
                    invalid={!!fieldErrors[key]}
                  />
                  <FieldError name={key} errors={fieldErrors} />
                </CCol>
              ))}
            </CRow>

            <hr className="my-3" />
            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong>Sucursales</strong>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                type="button"
                onClick={addBranch}
              >
                <CIcon icon={cilPlus} className="me-1" />
                Agregar sucursal
              </CButton>
            </div>

            {form.branches.length === 0 && (
              <div className="text-body-secondary small mb-2">No hay sucursales registradas.</div>
            )}

            {form.branches.map((b, i) => (
              <div className="border rounded p-2 mb-2" key={b.uid}>
                <CRow className="g-2 align-items-start">
                  <CCol xs={12} md={4}>
                    <CFormLabel className="small mb-1">Nombre</CFormLabel>
                    <CFormInput
                      size="sm"
                      value={b.name}
                      maxLength={128}
                      placeholder="Matriz"
                      onChange={updateBranch(b.uid, 'name')}
                      invalid={!!fieldErrors[`branches.${i}.name`]}
                    />
                    <FieldError name={`branches.${i}.name`} errors={fieldErrors} />
                  </CCol>
                  <CCol xs={12} md={6}>
                    <CFormLabel className="small mb-1">Dirección</CFormLabel>
                    <CFormInput
                      size="sm"
                      value={b.address}
                      maxLength={256}
                      placeholder="Av. Siempre Viva 123"
                      onChange={updateBranch(b.uid, 'address')}
                      invalid={!!fieldErrors[`branches.${i}.address`]}
                    />
                    <FieldError name={`branches.${i}.address`} errors={fieldErrors} />
                  </CCol>
                  <CCol xs={12} md={2} className="d-flex gap-1 justify-content-end align-items-end">
                    <CButton
                      size="sm"
                      variant="ghost"
                      color="secondary"
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveBranch(i, -1)}
                      title="Subir"
                    >
                      <CIcon icon={cilArrowTop} />
                    </CButton>
                    <CButton
                      size="sm"
                      variant="ghost"
                      color="secondary"
                      type="button"
                      disabled={i === form.branches.length - 1}
                      onClick={() => moveBranch(i, 1)}
                      title="Bajar"
                    >
                      <CIcon icon={cilArrowBottom} />
                    </CButton>
                    <CButton
                      size="sm"
                      variant="ghost"
                      color="danger"
                      type="button"
                      onClick={() => removeBranch(b.uid)}
                      title="Eliminar sucursal"
                    >
                      <CIcon icon={cilTrash} />
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

export default CompanySettingsCard
