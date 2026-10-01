import type { IconName } from 'src/shared/icons/registry'

// The three colour modes, shared by the header's own selector (from `md` up) and the "Tema" section
// of the user menu, which is where the selector lives on a phone. One list so the two cannot drift.
export const THEME_OPTIONS: { value: string; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Claro', icon: 'themeLight' },
  { value: 'dark', label: 'Oscuro', icon: 'themeDark' },
  { value: 'auto', label: 'Automático', icon: 'themeAuto' },
]
