import type { MaterialForm, RequirementForm } from './optimizerForm'

// Autosave del optimizer en localStorage: red de seguridad contra refresh accidental. Es una copia
// de la sesión actual (este navegador), complementaria a los borradores nombrados del servidor.
// La clave va versionada; si el esquema cambia, se sube el sufijo y se descarta lo viejo al leer.
const KEY = 'cutter:optimizer:autosave:v1'

export interface OptimizerAutosave {
  version: 1
  savedAt: number
  draftId: number | null
  draftName: string
  materials: MaterialForm[]
  requirements: RequirementForm[]
}

export const loadAutosave = (): OptimizerAutosave | null => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as OptimizerAutosave
    return data.version === 1 && Array.isArray(data.materials) ? data : null
  } catch {
    return null
  }
}

export const saveAutosave = (data: OptimizerAutosave): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* cuota llena: ignorar */
  }
}

export const clearAutosave = (): void => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}
