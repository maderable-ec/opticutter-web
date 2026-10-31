import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectsApi } from './projectsApi'
import type { ProjectListParams, ProjectStatus, ProjectWrite } from './types'

const KEY = ['projects']

export const useProjects = (params: ProjectListParams) =>
  useQuery({
    queryKey: [...KEY, params],
    queryFn: () => projectsApi.list(params),
    placeholderData: keepPreviousData,
  })

// With an id, overwrite what is sent of that project (PUT); without, create one (POST), owned by the
// caller, which needs its name.
type SaveProjectVars =
  | { id: number; data: Partial<ProjectWrite> }
  | { id?: never; data: ProjectWrite }

export const useSaveProject = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: SaveProjectVars) =>
      vars.id !== undefined
        ? projectsApi.update(vars.id, vars.data)
        : projectsApi.create(vars.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useSetProjectStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Exclude<ProjectStatus, 'quoted'> }) =>
      projectsApi.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
