import { useId, useState } from 'react'
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
} from '@coreui/react'

import { ApiError } from 'src/shared/api/types'
import { useAllProductFamilies } from 'src/features/productFamilies/useProductFamilies'
import FieldError from 'src/shared/components/FieldError'
import { BOARD_SUBTYPES, EDGE_BANDING_SUBTYPES, subtypeLabel } from './productSubtypes'
import type { Product, ProductPayload, ProductType } from './types'
import Spinner from 'src/shared/components/Spinner'

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

  // Each label names its field, for a screen reader and for the tap on the label itself.
  const id = useId()
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

  // The family picker, the same for both types; its note differs because a board and a tape are
  // coordinated from opposite ends.
  const familySelect = (
    <CFormSelect
      id={`${id}-family`}
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
  )

  const required = <span className="text-danger">*</span>

  return (
    <CForm onSubmit={handleSubmit} className="d-flex flex-column overflow-hidden">
      <CModalBody>
        {/* Three sections — the article, its prices, what its type measures — where it used to be
            one run of some twenty fields. On a phone the dialog is the whole screen and this is a
            long scroll; the headings are what says where in it you are. */}
        <fieldset className="form-section">
          <legend className="eyebrow">Artículo</legend>
          <CRow className="g-3">
            <CCol xs={12}>
              <CFormLabel htmlFor={`${id}-type`}>Tipo {required}</CFormLabel>
              <CFormSelect
                id={`${id}-type`}
                value={type}
                onChange={handleTypeChange}
                disabled={isEdit}
                required
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol xs={12} sm={5}>
              <CFormLabel htmlFor={`${id}-code`}>Código {required}</CFormLabel>
              <CFormInput
                id={`${id}-code`}
                value={form.code}
                onChange={set('code')}
                required
                maxLength={32}
                placeholder="Ej: MDP-SL-CSH-15"
              />
              <FieldError name="code" errors={fieldErrors} />
            </CCol>

            <CCol xs={12} sm={7}>
              <CFormLabel htmlFor={`${id}-name`}>Nombre {required}</CFormLabel>
              <CFormInput
                id={`${id}-name`}
                value={form.name}
                onChange={set('name')}
                required
                maxLength={128}
                placeholder="Ej: MDP 15mm Cashmere"
              />
              <FieldError name="name" errors={fieldErrors} />
            </CCol>

            <CCol xs={12}>
              <CFormLabel htmlFor={`${id}-description`}>Descripción</CFormLabel>
              <CFormTextarea
                id={`${id}-description`}
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
                id={`${id}-active`}
                label="Activo"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
            </CCol>
          </CRow>
        </fieldset>

        <fieldset className="form-section">
          <legend className="eyebrow">Precios sin IVA</legend>
          <CRow className="g-3">
            <CCol xs={12} sm={4}>
              <CFormLabel htmlFor={`${id}-price`}>Precio 1 {required}</CFormLabel>
              <CFormInput
                id={`${id}-price`}
                type="number"
                inputMode="decimal"
                value={form.price}
                onChange={set('price')}
                required
                min={0}
                step="0.000001"
                placeholder="0.00"
              />
              <FieldError name="price" errors={fieldErrors} />
            </CCol>

            <CCol xs={12} sm={4}>
              <CFormLabel htmlFor={`${id}-price2`}>Precio 2</CFormLabel>
              <CFormInput
                id={`${id}-price2`}
                type="number"
                inputMode="decimal"
                value={form.price2}
                onChange={set('price2')}
                min={0}
                step="0.000001"
                placeholder="Usa el Precio 1"
              />
              <FieldError name="price2" errors={fieldErrors} />
            </CCol>

            <CCol xs={12} sm={4}>
              <CFormLabel htmlFor={`${id}-price3`}>Precio 3</CFormLabel>
              <CFormInput
                id={`${id}-price3`}
                type="number"
                inputMode="decimal"
                value={form.price3}
                onChange={set('price3')}
                min={0}
                step="0.000001"
                placeholder="Usa el Precio 1"
              />
              <FieldError name="price3" errors={fieldErrors} />
            </CCol>
            <CCol xs={12}>
              <div className="form-text mt-0">
                El Precio 1 es el de lista. Sin Precio 2 o 3, la cotización usa el 1 en ese nivel.
              </div>
            </CCol>
          </CRow>
        </fieldset>

        {type === 'board' && (
          <fieldset className="form-section">
            <legend className="eyebrow">Atributos del tablero</legend>
            <CRow className="g-3">
              <CCol xs={4}>
                <CFormLabel htmlFor={`${id}-height`}>Largo (mm) {required}</CFormLabel>
                <CFormInput
                  id={`${id}-height`}
                  type="number"
                  inputMode="numeric"
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
                <CFormLabel htmlFor={`${id}-width`}>Ancho (mm) {required}</CFormLabel>
                <CFormInput
                  id={`${id}-width`}
                  type="number"
                  inputMode="numeric"
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
                <CFormLabel htmlFor={`${id}-thickness`}>Grosor (mm) {required}</CFormLabel>
                <CFormInput
                  id={`${id}-thickness`}
                  type="number"
                  inputMode="numeric"
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
                <CFormLabel htmlFor={`${id}-grain`}>Dirección de veta</CFormLabel>
                <CFormInput
                  id={`${id}-grain`}
                  value={attrs.grainDirection}
                  onChange={setAttr('grainDirection')}
                  maxLength={4}
                  placeholder="Ej: H (opcional)"
                />
                <FieldError name="grainDirection" errors={fieldErrors} />
              </CCol>
              <CCol xs={6}>
                <CFormLabel htmlFor={`${id}-subtype`}>Subtipo</CFormLabel>
                <CFormSelect
                  id={`${id}-subtype`}
                  value={attrs.subtype}
                  onChange={setAttr('subtype')}
                >
                  <option value="">Sin especificar</option>
                  {BOARD_SUBTYPES.map((st) => (
                    <option key={st} value={st}>
                      {subtypeLabel(st)}
                    </option>
                  ))}
                </CFormSelect>
                <FieldError name="subtype" errors={fieldErrors} />
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor={`${id}-family`}>Familia</CFormLabel>
                {familySelect}
                <small className="text-body-secondary">
                  El diseño con el que coordinan los tapacantos. Se administra en Productos →
                  Familias; en un artículo sincronizado se siembra una sola vez desde la columna
                  OBS. del inventario, y a partir de ahí manda lo que se elija acá.
                </small>
                <FieldError name="familyId" errors={fieldErrors} />
              </CCol>
            </CRow>
          </fieldset>
        )}

        {type === 'edge_banding' && (
          <fieldset className="form-section">
            <legend className="eyebrow">Atributos del tapacanto</legend>
            <CRow className="g-3">
              <CCol xs={6} sm={4}>
                <CFormLabel htmlFor={`${id}-thickness`}>Grosor (mm) {required}</CFormLabel>
                <CFormInput
                  id={`${id}-thickness`}
                  type="number"
                  inputMode="decimal"
                  value={attrs.thickness}
                  onChange={setAttr('thickness')}
                  required
                  min={0.01}
                  step={0.01}
                  placeholder="0.45"
                />
                <FieldError name="thickness" errors={fieldErrors} />
              </CCol>
              <CCol xs={6} sm={4}>
                <CFormLabel htmlFor={`${id}-width`}>Ancho (mm) {required}</CFormLabel>
                <CFormInput
                  id={`${id}-width`}
                  type="number"
                  inputMode="numeric"
                  value={attrs.width}
                  onChange={setAttr('width')}
                  required
                  min={1}
                  step={1}
                  placeholder="19"
                />
                <FieldError name="width" errors={fieldErrors} />
              </CCol>
              <CCol xs={12} sm={4}>
                <CFormLabel htmlFor={`${id}-band`}>Tipo de canto</CFormLabel>
                <CFormSelect
                  id={`${id}-band`}
                  value={attrs.bandType}
                  onChange={setAttr('bandType')}
                >
                  <option value="">Sin especificar</option>
                  <option value="Soft">Suave (Soft)</option>
                  <option value="Hard">Duro (Hard)</option>
                </CFormSelect>
                <FieldError name="bandType" errors={fieldErrors} />
              </CCol>
              <CCol xs={6}>
                <CFormLabel htmlFor={`${id}-color`}>Color / Diseño</CFormLabel>
                <CFormInput
                  id={`${id}-color`}
                  value={attrs.color}
                  onChange={setAttr('color')}
                  maxLength={64}
                  placeholder="Ej: Cashmere"
                />
                <FieldError name="color" errors={fieldErrors} />
              </CCol>
              <CCol xs={6}>
                <CFormLabel htmlFor={`${id}-length`}>Largo del rollo (mm)</CFormLabel>
                <CFormInput
                  id={`${id}-length`}
                  type="number"
                  inputMode="numeric"
                  value={attrs.length}
                  onChange={setAttr('length')}
                  min={1}
                  step={1}
                  placeholder="Opcional"
                />
                <FieldError name="length" errors={fieldErrors} />
              </CCol>
              <CCol xs={12} sm={6}>
                <CFormLabel htmlFor={`${id}-subtype`}>Subtipo</CFormLabel>
                <CFormSelect
                  id={`${id}-subtype`}
                  value={attrs.subtype}
                  onChange={setAttr('subtype')}
                >
                  <option value="">Sin especificar</option>
                  {EDGE_BANDING_SUBTYPES.map((st) => (
                    <option key={st} value={st}>
                      {subtypeLabel(st)}
                    </option>
                  ))}
                </CFormSelect>
                <FieldError name="subtype" errors={fieldErrors} />
              </CCol>
              <CCol xs={12} sm={6}>
                <CFormLabel htmlFor={`${id}-family`}>Familia</CFormLabel>
                {familySelect}
                <small className="text-body-secondary">
                  Coordina con el tablero; nunca se imprime. Se administra en Productos → Familias.
                </small>
                <FieldError name="familyId" errors={fieldErrors} />
              </CCol>
              <CCol xs={12} sm={6}>
                <CFormLabel htmlFor={`${id}-alias`}>Alias</CFormLabel>
                <CFormInput
                  id={`${id}-alias`}
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
            </CRow>
          </fieldset>
        )}

        {hasGenericError && (
          <div className="text-danger small mt-3">
            {error?.message || 'Error al guardar. Intente nuevamente.'}
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </CButton>
        <CButton color="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner size="sm" /> : 'Guardar'}
        </CButton>
      </CModalFooter>
    </CForm>
  )
}

export default ProductForm
