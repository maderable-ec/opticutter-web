import { httpClient } from 'src/shared/api/httpClient'
import { toQuery } from 'src/shared/api/crudApi'
import type {
  Project,
  ProjectListParams,
  ProjectStatus,
  ProjectSummary,
  ProjectWrite,
} from './types'

const BASE = '/api/v1/projects'

// The designer sees only their own projects; the admin and the seller, all of them. The API scopes
// it, so nothing here asks who is calling. No delete: a project is archived.
export const projectsApi = {
  list: ({ status, search, ownerId, offset = 0, limit = 20 }: ProjectListParams = {}) =>
    httpClient.list<ProjectSummary>(
      `${BASE}/?${toQuery({ status, search, ownerId, offset, limit })}`,
    ),
  get: (id: number) => httpClient.get<Project>(`${BASE}/${id}`),
  create: (data: ProjectWrite) => httpClient.post<Project>(`${BASE}/`, data),
  // Only while it is in progress (422 on `status` otherwise).
  update: (id: number, data: Partial<ProjectWrite>) =>
    httpClient.put<Project>(`${BASE}/${id}`, data),
  // in_progress ↔ ready, and to or from archived. `quoted` is set by creating a quote from it.
  setStatus: (id: number, status: Exclude<ProjectStatus, 'quoted'>) =>
    httpClient.patch<Project>(`${BASE}/${id}/status`, { status }),
}
