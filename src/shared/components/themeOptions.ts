import { cilContrast, cilMoon, cilSun } from '@coreui/icons'

// The three colour modes, shared by the header's own selector (from `md` up) and the "Tema" section
// of the user menu, which is where the selector lives on a phone. One list so the two cannot drift.
export const THEME_OPTIONS: { value: string; label: string; icon: string[] }[] = [
  { value: 'light', label: 'Claro', icon: cilSun },
  { value: 'dark', label: 'Oscuro', icon: cilMoon },
  { value: 'auto', label: 'Automático', icon: cilContrast },
]
