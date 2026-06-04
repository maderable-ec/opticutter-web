import { dashboardRoutes } from 'src/features/dashboard/routes'
import { widgetsRoutes } from 'src/features/widgets/routes'
import { showcaseRoutes } from 'src/features/showcase/routes'

export const routes = [...dashboardRoutes, ...widgetsRoutes, ...showcaseRoutes]
