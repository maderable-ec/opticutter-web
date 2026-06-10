import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'auto'

interface UIState {
  sidebarShow: boolean
  sidebarUnfoldable: boolean
  theme: Theme
  setSidebarShow: (value: boolean) => void
  setSidebarUnfoldable: (value: boolean) => void
  setTheme: (value: Theme) => void
}

const useUIStore = create<UIState>((set) => ({
  sidebarShow: true,
  sidebarUnfoldable: false,
  theme: 'light',

  setSidebarShow: (value) => set({ sidebarShow: value }),
  setSidebarUnfoldable: (value) => set({ sidebarUnfoldable: value }),
  setTheme: (value) => set({ theme: value }),
}))

export default useUIStore
