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
import { useAllProductFamilies } from 'src/features/productFamilies/useProductFamilies'
import FieldError from 'src/shared/components/FieldError'
import { BOARD_SUBTYPES, EDGE_BANDING_SUBTYPES, subtypeLabel } from './productSubtypes'
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
  subtype?: string
}

interface ProductFormState {
  code: string
  name: string
  description: string
  // The three NET prices. Blank on levels 2 and 3 means "no reduced price for
  // this article": billing falls back to level 1 rather than to zero.
  price: number | string
  price2: number | string
  price3: number | string
  isActive: boolean
  // Columns of the product, not keys of the attributes bag: the catalog sync
  // replaces that bag on every pass, so anything set here used to be wiped on
  // the next sync. The family is picked from a list rather than typed — an
  // equality on free text is exactly how a board and its tape drifted apart.
  familyId: number | ''
  alias: string
}

const EMPTY_BOARD_ATTRS: AttrsForm = {
  height: '',
  width: '',
  thickness: '',
  grainDirection: '',
  subtype: '',
}
const EMPTY_EDGE_ATTRS: AttrsForm = {
  thickness: '',
  width: '',
  bandType: '',
  color: '',
  length: '',
  subtype: '',
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
      subtype: a.subtype ?? '',
    }
  }
  const a = product.attributes ?? {}
  return {
    thickness: a.thickness ?? '',
    width: a.width ?? '',
    bandType: a.bandType ?? '',
    color: a.color ?? '',
    length: a.length ?? '',
    subtype: a.subtype ?? '',
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

interface ProductFormProps {
  product: Product | null
  onSubmit: (data: ProductPayload) => void
  onCancel: () => void
  isSubmitting: boolean
  error: Error | null
}

const ProductForm = ({ product, onSubmit, onCancel, isSubmitting, error }: ProductFormProps) => {
  const isEdit = !!product
  // The catalog's design groups, for the family picker. A reference list, cached
  // and small enough to fetch whole (75 designs on the live catalog).
  const { data: families = [] } = useAllProductFamilies()

  const [type, setType] = useState<ProductType>(product?.type ?? 'board')
  const [form, setForm] = useState<ProductFormState>({
    code: product?.code ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price ?? '',
    price2: product?.price2 ?? '',
    price3: product?.price3 ?? '',
    isActive: product?.isActive ?? true,
    familyId: product?.familyId ?? '',
    alias: product?.alias ?? '',
  })
  const [attrs, setAttrs] = useState<AttrsForm>(initAttrs(product))

  const fieldErrors = mapServerErrors(error)
  const hasGenericError = error && Object.keys(fieldErrors).length === 0

  const set =
    (field: 'code' | 'name' | 'description' | 'price' | 'price2' | 'price3') =>
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
            subtype: attrs.subtype || undefined,
          }
        : {
            thickness: Number(attrs.thickness),
            width: Number(attrs.width),
            bandType: attrs.bandType || null,
            color: attrs.color || null,
            length: attrs.length ? Number(attrs.length) : null,
            subtype: attrs.subtype || undefined,
          }

    onSubmit({
      type,
      code: form.code,
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      price2: form.price2 === '' ? null : Number(form.price2),
      price3: form.price3 === '' ? null : Number(form.price3),
      isActive: form.isActive,
      familyId: form.familyId === '' ? null : Number(form.familyId),
      // Edge banding only; the API's discriminated union drops it on a board.
      alias: type === 'edge_banding' ? form.alias.trim() || null : null,
      attributes,
    })
  }

  return (
    <CForm onSubmit={handleSubmit} className="d-flex flex-column overflow-hidden">
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
            <FieldError name="code" errors={fieldErrors} />
          </CCol>

          <CCol xs={6}>
            <CFormLabel>
              Precio 1 <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              type="number"
              value={form.price}
              onChange={set('price')}
              required
              min={0}
              step="0.000001"
              placeholder="0.00"
            />
            <div className="form-text">Precio de lista, sin IVA.</div>
            <FieldError name="price" errors={fieldErrors} />
          </CCol>

          <CCol xs={6}>
            <CFormLabel>Precio 2</CFormLabel>
            <CFormInput
              type="number"
              value={form.price2}
              onChange={set('price2')}
              min={0}
              step="0.000001"
              placeholder="Vacío = usa el Precio 1"
            />
            <FieldError name="price2" errors={fieldErrors} />
          </CCol>

          <CCol xs={6}>
            <CFormLabel>Precio 3</CFormLabel>
            <CFormInput
              type="number"
              value={form.price3}
              onChange={set('price3')}
              min={0}
              step="0.000001"
              placeholder="Vacío = usa el Precio 1"
            />
            <FieldError name="price3" errors={fieldErrors} />
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
            <FieldError name="name" errors={fieldErrors} />
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
            <FieldError name="description" errors={fieldErrors} />
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
                <FieldError name="height" errors={fieldErrors} />
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
                <FieldError name="width" errors={fieldErrors} />
              </CCol>
              <CCol xs={4}>
                <CFormLabel>
                  Grosor (mm) <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  type="number"
                  value={attrs.thickness}
                  onChange={setAttr('thickness')}
                  required
                  min={1}
                  step={1}
                  placeholder="15"
                />
                <FieldError name="thickness" errors={fieldErrors} />
              </CCol>
              <CCol xs={6}>
                <CFormLabel>Dirección de veta</CFormLabel>
                <CFormInput
                  value={attrs.grainDirection}
                  onChange={setAttr('grainDirection')}
                  maxLength={4}
                  placeholder="Ej: H (opcional)"
                />
                <FieldError name="grainDirection" errors={fieldErrors} />
              </CCol>
              <CCol xs={6}>
                <CFormLabel>Subtipo</CFormLabel>
                <CFormSelect value={attrs.subtype} onChange={setAttr('subtype')}>
                  <option value="">Sin especificar</option>
                  {BOARD_SUBTYPES.map((s) => (
                    <option key={s} value={s}>
                      {subtypeLabel(s)}
                    </option>
                  ))}
                </CFormSelect>
                <FieldError name="subtype" errors={fieldErrors} />
              </CCol>
              <CCol xs={12}>
                <CFormLabel>Familia</CFormLabel>
                <CFormSelect
                  value={form.familyId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      familyId: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                >
                  <option value="">— Sin familia —</option>
                  {families.map((fam) => (
                    <option key={fam.id} value={fam.id}>
                      {fam.name}
                    </option>
                  ))}
                </CFormSelect>
                <small className="text-body-secondary">
                  El diseño con el que coordinan los tapacantos. Se administra en Productos →
                  Familias; en un artículo sincronizado se siembra una sola vez desde la columna
                  OBS. del inventario, y a partir de ahí manda lo que se elija acá.
                </small>
                <FieldError name="familyId" errors={fieldErrors} />
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
                <CFormInput
                  type="number"
                  value={attrs.thickness}
                  onChange={setAttr('thickness')}
                  required
                  min={0.01}
                  step={0.01}
                  placeholder="0.45"
                />
                <FieldError name="thickness" errors={fieldErrors} />
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
                  placeholder="19"
                />
                <FieldError name="width" errors={fieldErrors} />
              </CCol>
              <CCol xs={4}>
                <CFormLabel>Tipo de canto</CFormLabel>
                <CFormSelect value={attrs.bandType} onChange={setAttr('bandType')}>
                  <option value="">Sin especificar</option>
                  <option value="Soft">Suave (Soft)</option>
                  <option value="Hard">Duro (Hard)</option>
                </CFormSelect>
                <FieldError name="bandType" errors={fieldErrors} />
              </CCol>
              <CCol xs={6}>
                <CFormLabel>Color / Diseño</CFormLabel>
                <CFormInput
                  value={attrs.color}
                  onChange={setAttr('color')}
                  maxLength={64}
                  placeholder="Ej: Cashmere"
                />
                <FieldError name="color" errors={fieldErrors} />
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
                <FieldError name="length" errors={fieldErrors} />
              </CCol>
              <CCol xs={6}>
                <CFormLabel>Subtipo</CFormLabel>
                <CFormSelect value={attrs.subtype} onChange={setAttr('subtype')}>
                  <option value="">Sin especificar</option>
                  {EDGE_BANDING_SUBTYPES.map((s) => (
                    <option key={s} value={s}>
                      {subtypeLabel(s)}
                    </option>
                  ))}
                </CFormSelect>
                <FieldError name="subtype" errors={fieldErrors} />
              </CCol>
              <CCol xs={6}>
                <CFormLabel>Familia</CFormLabel>
                <CFormSelect
                  value={form.familyId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      familyId: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                >
                  <option value="">— Sin familia —</option>
                  {families.map((fam) => (
                    <option key={fam.id} value={fam.id}>
                      {fam.name}
                    </option>
                  ))}
                </CFormSelect>
                <small className="text-body-secondary">
                  Coordina con el tablero; nunca se imprime. Se administra en Productos → Familias.
                </small>
                <FieldError name="familyId" errors={fieldErrors} />
              </CCol>
              <CCol xs={6}>
                <CFormLabel>Alias</CFormLabel>
                <CFormInput
                  value={form.alias}
                  onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
                  maxLength={20}
                  placeholder="Ej: CSH"
                />
                <small className="text-body-secondary">
                  Código corto que imprime la notación del taller (<code>1L CS CSH</code>), para
                  distinguir dos diseños canteados en la misma orden. Es del rollo, no del diseño.
                </small>
                <FieldError name="alias" errors={fieldErrors} />
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
