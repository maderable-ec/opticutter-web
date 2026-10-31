import type { MaterialForm, RequirementForm } from './optimizerForm'
import type { AdditionalServiceInput, LayoutAdjustment } from './types'

// Optimizer autosave in localStorage: safety net against accidental page refresh. Stores a copy of
// the current session (this browser), complementary to named drafts on the server.
// The key is versioned; if the schema changes, bump the suffix and stale data is discarded on read.
//
// One per scope: the optimizer quoting (`/preorders/new`) and the optimizer working on a designer's
// project (`/projects/new`) are two screens, and an admin who opens a project must not find it
// written over the quote they left half done.
export type OptimizerScope = 'quote' | 'project'

const KEYS: Record<OptimizerScope, string> = {
  quote: 'cutter:optimizer:autosave:v1',
  project: 'cutter:projects:autosave:v1',
}

// A designer's project, as the optimizer holds it.
export interface ProjectRef {
  id: number
  name: string
}

export interface OptimizerAutosave {
  version: 1
  savedAt: number
  draftId: number | null
  draftName: string
  materials: MaterialForm[]
  requirements: RequirementForm[]
  // Billed additional services, stored in API shape (complete lines only — a half-typed row is not
  // worth restoring). Optional, and the version stays 1 on purpose: the field is purely additive, so
  // an older payload still loads, whereas bumping the key would throw away whatever work is sitting
  // in an open tab right now.
  services?: AdditionalServiceInput[]
  // Hand adjustments to the plan. Additive for the same reason as `services`.
  layoutAdjustments?: LayoutAdjustment[] | null
  // The project this work belongs to. In the project scope, the one it is saved to; in the quote
  // scope, the one being quoted, whose id rides on the quote. Additive, like the two above.
  project?: ProjectRef | null
  // Written by whoever just opened a project into the optimizer, so the arrival says so instead of
  // «restored from the last session». Never written by the optimizer itself: a refresh after that
  // is a restore again.
  opened?: boolean
}

export const loadAutosave = (scope: OptimizerScope = 'quote'): OptimizerAutosave | null => {
  try {
    const raw = localStorage.getItem(KEYS[scope])
    if (!raw) return null
    const data = JSON.parse(raw) as OptimizerAutosave
    return data.version === 1 && Array.isArray(data.materials) ? data : null
  } catch {
    return null
  }
}

export const saveAutosave = (data: OptimizerAutosave, scope: OptimizerScope = 'quote'): void => {
  try {
    localStorage.setItem(KEYS[scope], JSON.stringify(data))
  } catch {
    /* storage quota exceeded: ignore */
  }
}

export const clearAutosave = (scope: OptimizerScope = 'quote'): void => {
  try {
    localStorage.removeItem(KEYS[scope])
  } catch {
    /* noop */
  }
}
