import { create } from 'zustand'
import type { OrderStatus } from './types'

// Keeps the status filter selected on the orders list across navigation (e.g. opening an
// order and coming back), since OrdersPage unmounts on every route change.
interface OrdersFilterState {
  status: OrderStatus | ''
  setStatus: (status: OrderStatus | '') => void
}

const useOrdersFilterStore = create<OrdersFilterState>((set) => ({
  status: '',
  setStatus: (status) => set({ status }),
}))

export default useOrdersFilterStore
