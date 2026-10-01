import { create } from 'zustand'

import type { RecordLabel } from 'src/shared/navigation'

export type Theme = 'light' | 'dark' | 'auto'

interface UIState {
  // The full menu narrowed to its rail from `xl` (the arrow at its foot). Below `xl` it is always the
  // rail, whatever this says.
  sidebarNarrow: boolean
  // The phone's menu (`NavSheet`): opened by «Más» or by the header's «Menú», mounted once.
  navSheetShow: boolean
  // The open record's code, for the trail and the tab's title (`useRecordLabel`).
  recordLabel: RecordLabel | null
  theme: Theme
  setNavSheetShow: (value: boolean) => void
  setSidebarNarrow: (value: boolean) => void
  setRecordLabel: (value: RecordLabel | null) => void
  setTheme: (value: Theme) => void
}

const SIDEBAR_NARROW_KEY = 'cutter.ui.sidebarNarrow'

const useUIStore = create<UIState>((set) => ({
  // Absent = never chosen: the full menu, the way it comes.
  sidebarNarrow: localStorage.getItem(SIDEBAR_NARROW_KEY) === 'true',
  navSheetShow: false,
  recordLabel: null,
  // Not persisted here: CoreUI already stores the color mode itself, under
  // 'coreui-free-react-admin-template-theme' (see App.tsx).
  theme: 'light',

  setNavSheetShow: (value) => set({ navSheetShow: value }),

  setSidebarNarrow: (value) => {
    localStorage.setItem(SIDEBAR_NARROW_KEY, String(value))
    set({ sidebarNarrow: value })
  },

  setRecordLabel: (value) => set({ recordLabel: value }),

  setTheme: (value) => set({ theme: value }),
}))

export default useUIStore
