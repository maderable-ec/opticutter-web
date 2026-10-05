import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'

const OptimizerPage = lazy(() => import('./OptimizerPage'))

export const optimizerRoutes: AppRoute[] = [
  {
    // «Cotizar» is a new quote, so it lives with the quotes. Before `/preorders/:id` in the registry
    // (`routes.ts`): matched in order, `:id` would take `new` for a record.
    path: '/preorders/new',
    name: 'Cotizar',
    element: OptimizerPage,
    roles: ['administrador', 'vendedor'],
    // Side-by-side pieces grid and cut diagrams need every pixel of width available.
    fluid: true,
    actionBar: true,
  },
]
