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

// The designer's «Nuevo» (and «Nuevo proyecto» in the listing) with a despiece in progress.
export const DISCARD_PROJECT_WORK: ConfirmRequest = {
  title: 'Empezar un proyecto nuevo',
  body: 'Se descarta el despiece en curso. Lo que guardaste como proyecto no se toca.',
  confirmLabel: 'Descartar y empezar',
  tone: 'danger',
}

// Opening a project into the designer's optimizer while it holds other work.
export const DISCARD_FOR_PROJECT: ConfirmRequest = {
  title: 'Abrir proyecto',
  body: 'Se descarta el despiece en curso del optimizador. Lo que guardaste como proyecto no se toca.',
  confirmLabel: 'Descartar y abrir',
  tone: 'danger',
}

// «Cotizar» on a project while the quote's optimizer holds other work.
export const DISCARD_FOR_PROJECT_QUOTE: ConfirmRequest = {
  title: 'Cotizar proyecto',
  body: 'Se descarta el despiece en curso del optimizador. Lo que guardaste como borrador no se toca.',
  confirmLabel: 'Descartar y cotizar',
  tone: 'danger',
}
