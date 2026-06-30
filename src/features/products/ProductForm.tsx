import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CFormTextarea,
  CModalBody,
  CModalFooter,
  CRow,
  CSpinner,
} from '@coreui/react'

import { ApiError } from 'src/shared/api/types'
import type { Product, ProductPayload, ProductType } from './types'

const TYPES: { value: ProductType; label: string }[] = [
  { value: 'board', label: 'Tablero (Board)' },
  { value: 'edge_banding', label: 'Tapacanto (Edge Banding)' },
]

interface AttrsForm {
  height?: number | string
  width?: number | string
  thickness?: number | string
  grainDirection?: string
  bandType?: string
  color?: string
  length?: number | string
}

interface ProductFormState {
  code: string
  name: string
  description: string
  price: number | string
  isActive: boolean
}

const EMPTY_BOARD_ATTRS: AttrsForm = { height: '', width: '', thickness: '', grainDirection: '' }
const EMPTY_EDGE_ATTRS: AttrsForm = {
  thickness: '',
  width: '',
  bandType: '',
  color: '',
  length: '',
}

const initAttrs = (product: Product | null): AttrsForm => {
  if (!product) return EMPTY_BOARD_ATTRS
  if (product.type === 'board') {
    const a = product.attributes ?? {}
    return {
      height: a.height ?? '',
      width: a.width ?? '',
      thickness: a.thickness ?? '',
      grainDirection: a.grainDirection ?? '',
    }
  }
  const a = product.attributes ?? {}
  return {
    thickness: a.thickness ?? '',
    width: a.width ?? '',
    bandType: a.bandType ?? '',
    color: a.color ?? '',
    length: a.length ?? '',
  }
}

const mapServerErrors = (error: Error | null): Record<string, string> => {
  if (!(error instanceof ApiError)) return {}
  const out: Record<string, string> = {}
  for (const e of error.errors) {
    if (e.field) {
      const key = e.field.replace(/^body\.(?:attributes\.)?/, '')
      out[key] = e.message
    } else if (e.code === 'CONFLICT') {
      if (e.message.includes('código')) out.code = e.message
      else if (e.message.includes('nombre')) out.name = e.message
    }
  }
  return out
}

const FieldError = ({
  name,
  fieldErrors,
}: {
  name: string
  fieldErrors: Record<string, string>
}) => (fieldErrors[name] ? <div className="text-danger small mt-1">{fieldErrors[name]}</div> : null)

interface ProductFormProps {
  product: Product | null
  onSubmit: (data: ProductPayload) => void
  onCancel: () => void
  isSubmitting: boolean
  error: Error | null
}

const ProductForm = ({ product, onSubmit, onCancel, isSubmitting, error }: ProductFormProps) => {
  const isEdit = !!product

  const [type, setType] = useState<ProductType>(product?.type ?? 'board')
  const [form, setForm] = useState<ProductFormState>({
    code: product?.code ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price ?? '',
    isActive: product?.isActive ?? true,
  })
  const [attrs, setAttrs] = useState<AttrsForm>(initAttrs(product))

  const fieldErrors = mapServerErrors(error)
  const hasGenericError = error && Object.keys(fieldErrors).length === 0

  const set =
    (field: 'code' | 'name' | 'description' | 'price') =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  const setAttr =
    (field: keyof AttrsForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAttrs((a) => ({ ...a, [field]: e.target.value }))

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as ProductType
    setType(next)
    setAttrs(next === 'board' ? EMPTY_BOARD_ATTRS : EMPTY_EDGE_ATTRS)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const attributes =
      type === 'board'
        ? {
            height: Number(attrs.height),
            width: Number(attrs.width),
            thickness: Number(attrs.thickness),
            grainDirection: attrs.grainDirection || null,
          }
        : {
            thickness: Number(attrs.thickness),
            width: Number(attrs.width),
            bandType: attrs.bandType || null,
            color: attrs.color || null,
            length: attrs.length ? Number(attrs.length) : null,
          }

    onSubmit({
      type,
      code: form.code,
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      isActive: form.isActive,
      attributes,
    })
  }

  return (
    <CForm onSubmit={handleSubmit}>
      <CModalBody>
        <CRow className="g-3">
          <CCol xs={12}>
            <CFormLabel>
              Tipo <span className="text-danger">*</span>
            </CFormLabel>
            <CFormSelect value={type} onChange={handleTypeChange} disabled={isEdit} required>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </CFormSelect>
          </CCol>

          <CCol xs={6}>
            <CFormLabel>
              Código <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              value={form.code}
              onChange={set('code')}
              required
              maxLength={32}
              placeholder="Ej: MDP-SL-CSH-15"
            />
            <FieldError name="code" fieldErrors={fieldErrors} />
          </CCol>

          <CCol xs={6}>
            <CFormLabel>
              Precio <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              type="number"
              value={form.price}
              onChange={set('price')}
              required
              min={0}
              step="0.01"
              placeholder="0.00"
            />
            <FieldError name="price" fieldErrors={fieldErrors} />
          </CCol>

          <CCol xs={12}>
            <CFormLabel>
              Nombre <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              value={form.name}
              onChange={set('name')}
              required
              maxLength={128}
              placeholder="Ej: MDP 15mm Cashmere"
            />
            <FieldError name="name" fieldErrors={fieldErrors} />
          </CCol>

          <CCol xs={12}>
            <CFormLabel>Descripción</CFormLabel>
            <CFormTextarea
              value={form.description}
              onChange={set('description')}
              maxLength={256}
              rows={2}
              placeholder="Opcional"
            />
            <FieldError name="description" fieldErrors={fieldErrors} />
          </CCol>

          <CCol xs={12}>
            <CFormSwitch
              label="Activo"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
          </CCol>

          {type === 'board' && (
            <>
              <CCol xs={12}>
                <hr className="my-1" />
                <small className="text-body-secondary">Atributos del tablero</small>
              </CCol>
              <CCol xs={4}>
                <CFormLabel>
                  Largo (mm) <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  type="number"
                  value={attrs.height}
                  onChange={setAttr('height')}
                  required
                  min={1}
                  step={1}
                  placeholder="2800"
                />
                <FieldError name="height" fieldErrors={fieldErrors} />
              </CCol>
              <CCol xs={4}>
                <CFormLabel>
                  Ancho (mm) <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  type="number"
                  value={attrs.width}
                  onChange={setAttr('width')}
                  required
                  min={1}
                  step={1}
                  placeholder="2070"
                />
                <FieldError name="width" fieldErrors={fieldErrors} />
              </CCol>
              <CCol xs={4}>
                <CFormLabel>
                  Grosor (mm) <span className="text-danger">*</span>
                </CFormLabel>
                <CFormSelect value={attrs.thickness} onChange={setAttr('thickness')} required>
                  <option value="">Seleccionar…</option>
                  <option value="15">15 mm</option>
                  <option value="36">36 mm</option>
                </CFormSelect>
                <FieldError name="thickness" fieldErrors={fieldErrors} />
              </CCol>
              <CCol xs={12}>
                <CFormLabel>Dirección de veta</CFormLabel>
                <CFormInput
                  value={attrs.grainDirection}
                  onChange={setAttr('grainDirection')}
                  maxLength={4}
                  placeholder="Ej: H (opcional)"
                />
                <FieldError name="grainDirection" fieldErrors={fieldErrors} />
              </CCol>
            </>
          )}

          {type === 'edge_banding' && (
            <>
              <CCol xs={12}>
                <hr className="my-1" />
                <small className="text-body-secondary">Atributos del tapacanto</small>
              </CCol>
              <CCol xs={4}>
                <CFormLabel>
                  Grosor (mm) <span className="text-danger">*</span>
                </CFormLabel>
                <CFormSelect value={attrs.thickness} onChange={setAttr('thickness')} required>
                  <option value="">Seleccionar…</option>
                  <option value="0.45">0.45 mm</option>
                  <option value="1.0">1.0 mm</option>
                  <option value="1.5">1.5 mm</option>
                </CFormSelect>
                <FieldError name="thickness" fieldErrors={fieldErrors} />
              </CCol>
              <CCol xs={4}>
                <CFormLabel>
                  Ancho (mm) <span className="text-danger">*</span>
                </CFormLabel>
                <CFormSelect value={attrs.width} onChange={setAttr('width')} required>
                  <option value="">Seleccionar…</option>
                  <option value="19">19 mm</option>
                  <option value="40">40 mm</option>
                </CFormSelect>
                <FieldError name="width" fieldErrors={fieldErrors} />
              </CCol>
              <CCol xs={4}>
                <CFormLabel>Tipo de canto</CFormLabel>
                <CFormSelect value={attrs.bandType} onChange={setAttr('bandType')}>
                  <option value="">Sin especificar</option>
                  <option value="Soft">Suave (Soft)</option>
                  <option value="Hard">Duro (Hard)</option>
                </CFormSelect>
                <FieldError name="bandType" fieldErrors={fieldErrors} />
              </CCol>
              <CCol xs={6}>
                <CFormLabel>Color / Diseño</CFormLabel>
                <CFormInput
                  value={attrs.color}
                  onChange={setAttr('color')}
                  maxLength={64}
                  placeholder="Ej: Cashmere"
                />
                <FieldError name="color" fieldErrors={fieldErrors} />
              </CCol>
              <CCol xs={6}>
                <CFormLabel>Largo del rollo (mm)</CFormLabel>
                <CFormInput
                  type="number"
                  value={attrs.length}
                  onChange={setAttr('length')}
                  min={1}
                  step={1}
                  placeholder="Opcional"
                />
                <FieldError name="length" fieldErrors={fieldErrors} />
              </CCol>
            </>
          )}

          {hasGenericError && (
            <CCol xs={12}>
              <div className="text-danger small">
                {error?.message || 'Error al guardar. Intente nuevamente.'}
              </div>
            </CCol>
          )}
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" type="button" onClick={onCancel}>
          Cancelar
        </CButton>
        <CButton color="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <CSpinner size="sm" /> : 'Guardar'}
        </CButton>
      </CModalFooter>
    </CForm>
  )
}

export default ProductForm
