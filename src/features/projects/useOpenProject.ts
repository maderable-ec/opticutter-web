import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { resetOptimizerSession } from 'src/shared/analytics'
import { apiErrorMessage } from 'src/shared/api/errors'
import { useConfirm } from 'src/shared/hooks/useConfirm'
import { useToastStore } from 'src/shared/store/toastStore'
import {
  DISCARD_FOR_PROJECT,
  DISCARD_FOR_PROJECT_QUOTE,
  DISCARD_PROJECT_WORK,
} from 'src/features/optimizer/confirmations'
import { clearAutosave, loadAutosave, saveAutosave } from 'src/features/optimizer/optimizerStorage'
import { PROJECT_OPTIMIZER_PATH } from './paths'
import { projectsApi } from './projectsApi'
import type { ProjectSummary } from './types'

// Taking a project into the optimizer. The optimizer restores its autosave on arrival, so opening
// one is writing it there, the way a loaded draft would be, and going:
//
// - `edit`: the designer's optimizer («Diseñar»), saving back to the project.
// - `quote`: the seller's (`/preorders/new`), as a new job whose quote carries the project's id.
//
// Work already sitting in that optimizer is asked about first, with the question its own «Nuevo»
// asks. Reopening the very project being edited just goes back to it: its work there is newer than
// what the server holds.
//
// Render `dialog` beside the buttons.
export const useOpenProject = () => {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const [confirm, dialog] = useConfirm()
  const [openingId, setOpeningId] = useState<number | null>(null)

  const open = async (project: ProjectSummary, mode: 'edit' | 'quote') => {
    const scope = mode === 'edit' ? 'project' : 'quote'
    const path = mode === 'edit' ? PROJECT_OPTIMIZER_PATH : '/preorders/new'
    // Read on the click: another tab may have left work since the screen loaded.
    const current = loadAutosave(scope)
    if (mode === 'edit' && current?.project?.id === project.id) {
      void navigate(path)
      return
    }
    if (
      current &&
      !(await confirm(mode === 'edit' ? DISCARD_FOR_PROJECT : DISCARD_FOR_PROJECT_QUOTE))
    )
      return

    setOpeningId(project.id)
    try {
      const { payload } = await projectsApi.get(project.id)
      saveAutosave(
        {
          version: 1,
          savedAt: Date.now(),
          draftId: null,
          draftName: '',
          materials: payload.materials ?? [],
          requirements: payload.requirements ?? [],
          // A project bills no services: the seller adds them when quoting.
          services: [],
          layoutAdjustments: payload.layoutAdjustments ?? null,
          project: { id: project.id, name: project.name },
          opened: true,
        },
        scope,
      )
      // The funnel's "opened the diagram" marks belong to the work just replaced.
      resetOptimizerSession()
      void navigate(path)
    } catch (error) {
      addToast(
        apiErrorMessage(error instanceof Error ? error : null, 'No se pudo abrir el proyecto.') ??
          'No se pudo abrir el proyecto.',
        'danger',
      )
    } finally {
      setOpeningId(null)
    }
  }

  // «Nuevo proyecto»: the designer's optimizer from zero, after asking about the work in it.
  const startNew = async () => {
    if (loadAutosave('project')) {
      if (!(await confirm(DISCARD_PROJECT_WORK))) return
      clearAutosave('project')
      resetOptimizerSession()
    }
    void navigate(PROJECT_OPTIMIZER_PATH)
  }

  return {
    openProject: (project: ProjectSummary, mode: 'edit' | 'quote') => void open(project, mode),
    startProject: () => void startNew(),
    openingId,
    dialog,
  }
}
