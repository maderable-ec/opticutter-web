import { create } from 'zustand'

// Global, ephemeral notifications. Kept intentionally tiny: any component pushes a message via
// `addToast`; <AppToaster /> (mounted once in the admin layout) renders and auto-dismisses them.
// Used so far for print-dispatch feedback, which spans several pages and must survive navigation.
export type ToastColor = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'

export interface ToastItem {
  id: number
  message: string
  color: ToastColor
}

interface ToastState {
  toasts: ToastItem[]
  addToast: (message: string, color?: ToastColor) => void
  removeToast: (id: number) => void
}

let seq = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, color = 'primary') =>
    set((state) => ({ toasts: [...state.toasts, { id: ++seq, message, color }] })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
