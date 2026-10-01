import StatusBadge, { type StatusConfigEntry } from './StatusBadge'

const ACTIVE: StatusConfigEntry = { tone: 'success', icon: 'active', label: 'Activo' }
const INACTIVE: StatusConfigEntry = { tone: 'neutral', icon: 'inactive', label: 'Inactivo' }

const MASCULINE: Record<string, StatusConfigEntry> = { true: ACTIVE, false: INACTIVE }
const FEMININE: Record<string, StatusConfigEntry> = {
  true: { ...ACTIVE, label: 'Activa' },
  false: { ...INACTIVE, label: 'Inactiva' },
}

interface ActiveBadgeProps {
  active: boolean
  // «Activa» for the feminine nouns of the catalog (a branch, a family).
  feminine?: boolean
}

// Whether a catalog record is in use. A state, so it gets a tone, an icon and the word, like an
// order's: it was a solid green or grey badge, told apart by colour alone. Inactive is neutral and
// not danger — nothing went wrong, the record is just out of use.
const ActiveBadge = ({ active, feminine = false }: ActiveBadgeProps) => (
  <StatusBadge config={feminine ? FEMININE : MASCULINE} value={String(active)} />
)

export default ActiveBadge
