import { dashboardRoutes } from 'src/features/dashboard/routes'
import { widgetsRoutes } from 'src/features/widgets/routes'
import { showcaseRoutes } from 'src/features/showcase/routes'
import { clientsRoutes } from 'src/features/clients/routes'
import { ordersRoutes } from 'src/features/orders/routes'

export const routes = [
  ...dashboardRoutes,
  ...widgetsRoutes,
  ...showcaseRoutes,
  ...clientsRoutes,
  ...ordersRoutes,
]
