import { lazy } from 'react'
import type { AppRoute } from 'src/shared/routes'
import { PROJECT_OPTIMIZER_PATH, PROJECTS_PATH } from './paths'

const ProjectsPage = lazy(() => import('./ProjectsPage'))
const ProjectOptimizerPage = lazy(() => import('./ProjectOptimizerPage'))

export const projectsRoutes: AppRoute[] = [
  {
    // The designer's desk and the sellers' queue: the API scopes the rows to each.
    path: PROJECTS_PATH,
    name: 'Proyectos',
    element: ProjectsPage,
    roles: ['administrador', 'vendedor', 'proyectista'],
  },
  {
    // The optimizer working on a project. Its own path, not `/preorders/new`: a path change remounts
    // the page, so the quote's work and the project's never share a screen (nor an autosave).
    path: PROJECT_OPTIMIZER_PATH,
    name: 'Diseñar',
    element: ProjectOptimizerPage,
    roles: ['administrador', 'proyectista'],
    fluid: true,
    actionBar: true,
  },
]
