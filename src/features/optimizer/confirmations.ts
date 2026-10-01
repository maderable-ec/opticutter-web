import type { ConfirmRequest } from 'src/shared/hooks/useConfirm'

// The two questions the optimizer asks from more than one screen, worded once.

// «Nueva cotización» (Inicio, the listings, the optimizer's own menu) with a despiece in progress.
export const DISCARD_WORK: ConfirmRequest = {
  title: 'Empezar una cotización nueva',
  body: 'Se descarta el despiece en curso. Lo que guardaste como borrador no se toca.',
  confirmLabel: 'Descartar y empezar',
  tone: 'danger',
}

// «Otra alternativa» over a plan with hand adjustments: another plan would bury them, so they go.
export const DISCARD_ADJUSTMENTS: ConfirmRequest = {
  title: 'Calcular otra alternativa',
  body: 'Otra alternativa es otro plan, así que se descartan los ajustes manuales de la distribución.',
  confirmLabel: 'Descartar ajustes',
  tone: 'danger',
}
