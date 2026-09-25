import { useState } from 'react'
import { CButton, CFormInput, CListGroup, CListGroupItem, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckAlt } from '@coreui/icons'

import { MASK } from 'src/shared/analytics'
import { useDebounce } from 'src/shared/hooks/useDebounce'
import { clientName } from 'src/shared/utils/format'
import { useClientsMin } from './useClients'
import type { Client } from './types'

// Picking one client out of the whole (server-searched) list, for a form that has to say
// unmistakably WHICH client was picked.
//
// It replaces a `CFormSelect htmlSize={6}` — a six-row listbox, which reads as a select stuck
// open: clicking a row changed nothing visible on the page, so the click was reported as not
// working. Here the list is a search RESULT, and choosing collapses it into the picked client:
// the answer replaces the question, which is the confirmation the listbox never gave.
//
// The value is the client OBJECT, not its id. The card, the phone check and the summary all read
// it straight, so none of them depends on the row still being in the current search results —
// clearing the search box used to blank the selection's label while the id stayed set.

interface ClientPickerProps {
  value: Client | null
  onChange: (client: Client) => void
  // The search term is lifted so it survives stepping away and back; the results themselves come
  // from React Query's cache under the same key.
  search: string
  onSearchChange: (term: string) => void
  // Way out of the empty state: no client matches, so create one.
  onCreateNew: () => void
  invalid?: boolean
}

const ClientPicker = ({
  value,
  onChange,
  search,
  onSearchChange,
  onCreateNew,
  invalid = false,
}: ClientPickerProps) => {
  // "Cambiar" reopens the search without dropping the current client, so a mis-click costs nothing.
  // It remembers WHICH client it is changing, not just that it is: a client saved from the form
  // next door (a new one, or the phone just filled in) arrives as a new `value`, and that has to
  // settle the picker back into its card instead of leaving the list open over the answer.
  const [changingFrom, setChangingFrom] = useState<string | null>(null)
  const changing = !!value && changingFrom === String(value.id)

  const debounced = useDebounce(search)
  const { data, isFetching } = useClientsMin(debounced)
  const clients = data?.items ?? []

  const pick = (client: Client) => {
    onChange(client)
    setChangingFrom(null)
  }

  if (value && !changing) {
    return (
      <div className="border rounded-3 p-2 d-flex align-items-center gap-2">
        <CIcon icon={cilCheckAlt} className="text-primary flex-shrink-0" />
        <div className="flex-grow-1 min-w-0" {...MASK}>
          <div className="fw-semibold text-truncate">{clientName(value)}</div>
          <div className="small text-body-secondary text-truncate">
            @{value.identifier}
            {value.phone ? ` · ${value.phone}` : ''}
          </div>
        </div>
        <CButton
          size="sm"
          color="secondary"
          variant="ghost"
          type="button"
          onClick={() => setChangingFrom(String(value.id))}
        >
          Cambiar
        </CButton>
      </div>
    )
  }

  return (
    <div>
      <CFormInput
        placeholder="Buscar por nombre o identificador…"
        value={search}
        invalid={invalid}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div
        className="border rounded-3 mt-1 overflow-auto"
        style={{ maxHeight: 260 }}
        role="listbox"
        aria-label="Resultados de clientes"
      >
        {isFetching && clients.length === 0 ? (
          <div className="text-center py-3">
            <CSpinner size="sm" color="primary" />
          </div>
        ) : clients.length === 0 ? (
          <div className="px-3 py-3 small text-body-secondary">
            Ningún cliente coincide con la búsqueda.{' '}
            <CButton color="link" size="sm" className="p-0 align-baseline" onClick={onCreateNew}>
              Crear cliente nuevo
            </CButton>
          </div>
        ) : (
          <CListGroup flush>
            {clients.map((c) => (
              // No `active` state on the rows: Bootstrap paints it white on primary (3.58:1), the
              // contrast trap this palette keeps hitting. What says "this one" is the card above,
              // which is all that is left on screen once a row is chosen.
              <CListGroupItem
                key={c.id}
                as="button"
                type="button"
                className="d-flex align-items-center gap-2 text-start"
                onClick={() => pick(c)}
              >
                <div className="flex-grow-1 min-w-0" {...MASK}>
                  <div className="fw-semibold text-truncate">{clientName(c)}</div>
                  <div className="small text-body-secondary">@{c.identifier}</div>
                </div>
                {/* Said before the pick, not after: a client with no phone cannot be quoted at
                    all, and finding that out from a disabled button two fields later is late. */}
                {c.phone == null && (
                  <span className="small text-warning-emphasis flex-shrink-0">Sin celular</span>
                )}
              </CListGroupItem>
            ))}
          </CListGroup>
        )}
      </div>
      {value && (
        <CButton
          color="link"
          size="sm"
          className="px-0 mt-1"
          type="button"
          onClick={() => setChangingFrom(null)}
          {...MASK}
        >
          Cancelar y dejar {clientName(value)}
        </CButton>
      )}
    </div>
  )
}

export default ClientPicker
