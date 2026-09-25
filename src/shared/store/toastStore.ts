import { create } from 'zustand'

// Global, ephemeral notifications. Kept intentionally tiny: any component pushes a message via
// `addToast`; <AppToaster /> (mounted once in the admin layout) renders and auto-dismisses them.
// Used so far for print-dispatch feedback, which spans several pages and must survive navigation.
export type ToastColor = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'

export interface ToastItem {
  id: number
  message: string
  color: ToastColor
  // The message quotes free text that may name a client (a draft's name): masked in session replay.
  mask?: boolean
}

interface ToastState {
  toasts: ToastItem[]
  addToast: (message: string, color?: ToastColor, options?: { mask?: boolean }) => void
  removeToast: (id: number) => void
}

let seq = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, color = 'primary', options) =>
    set((state) => ({
      toasts: [...state.toasts, { id: ++seq, message, color, mask: options?.mask }],
    })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
