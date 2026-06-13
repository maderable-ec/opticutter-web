import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { CDropdown, CDropdownMenu, CDropdownToggle, CFormInput } from '@coreui/react'

export interface SelectOption {
  value: string
  label: string
  sublabel?: string // texto secundario (p. ej. código), también buscable
}

interface SearchableSelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  size?: 'sm' | 'lg'
}

// Normaliza para búsqueda insensible a mayúsculas y acentos (locale es).
const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

// Combobox con filtro por texto: toggle estilo <select> + buscador + lista filtrada. Reemplaza a
// CFormSelect cuando la lista es larga (CoreUI free no trae un select con búsqueda).
const SearchableSelect = ({
  value,
  options,
  onChange,
  placeholder = 'Seleccionar…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Sin resultados',
  disabled = false,
  size,
}: SearchableSelectProps) => {
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const tokens = norm(query).split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return options
    return options.filter((o) => {
      const hay = norm(`${o.label} ${o.sublabel ?? ''}`)
      return tokens.every((t) => hay.includes(t))
    })
  }, [options, query])

  // Al abrir, enfoca el buscador (el filtro se limpia en close()).
  useEffect(() => {
    if (visible) inputRef.current?.focus()
  }, [visible])

  const close = () => {
    setVisible(false)
    setQuery('')
  }

  const select = (val: string) => {
    onChange(val)
    close()
  }

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) select(filtered[0].value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  const toggleLabel = selected
    ? selected.sublabel
      ? `${selected.label} (${selected.sublabel})`
      : selected.label
    : placeholder

  const sizeClass = size === 'sm' ? ' form-select-sm' : size === 'lg' ? ' form-select-lg' : ''

  return (
    <CDropdown
      variant="dropdown"
      autoClose="outside"
      visible={visible}
      onShow={() => setVisible(true)}
      onHide={close}
    >
      {/* `custom` clona este botón y le adjunta el toggle, evitando la clase .btn (borde transparente)
          para que el borde gris de form-select se vea como en los demás campos. */}
      <CDropdownToggle custom disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className={`form-select text-start text-truncate${sizeClass}${
            selected ? '' : ' text-body-secondary'
          }`}
          style={{ width: '100%' }}
        >
          {toggleLabel}
        </button>
      </CDropdownToggle>
      <CDropdownMenu style={{ minWidth: 260, maxWidth: 380 }}>
        <div className="px-2 pt-1 pb-2">
          <CFormInput
            ref={inputRef}
            size="sm"
            value={query}
            placeholder={searchPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
          />
        </div>
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-body-secondary small">{emptyText}</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`dropdown-item d-flex justify-content-between gap-2${
                  o.value === value ? ' active' : ''
                }`}
                onClick={() => select(o.value)}
              >
                <span className="text-truncate">{o.label}</span>
                {o.sublabel && <span className="small opacity-75">{o.sublabel}</span>}
              </button>
            ))
          )}
        </div>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default SearchableSelect
