import { CNavItem } from '@coreui/react'
import type { NavItem } from 'src/shared/components/AppSidebarNav'
import { PROJECT_OPTIMIZER_PATH, PROJECTS_PATH } from './paths'

export const projectsNav: NavItem[] = [
  {
    component: CNavItem,
    name: 'Diseñar',
    to: PROJECT_OPTIMIZER_PATH,
    icon: 'designAction',
    // The designer's button on top, as «Cotizar» is the seller's. The admin opens a project from the
    // listing instead: one role, one button.
    roles: ['proyectista'],
    action: true,
  },
  {
    component: CNavItem,
    name: 'Proyectos',
    to: PROJECTS_PATH,
    icon: 'projects',
    roles: ['administrador', 'vendedor', 'proyectista'],
  },
]
