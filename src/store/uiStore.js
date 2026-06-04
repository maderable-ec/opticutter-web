import { create } from 'zustand'

const useUIStore = create((set) => ({
  sidebarShow: true,
  sidebarUnfoldable: false,
  theme: 'light',

  setSidebarShow: (value) => set({ sidebarShow: value }),
  setSidebarUnfoldable: (value) => set({ sidebarUnfoldable: value }),
  setTheme: (value) => set({ theme: value }),
}))

export default useUIStore
