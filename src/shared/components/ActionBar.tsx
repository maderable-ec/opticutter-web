import type { ReactNode } from 'react'
import { CButton } from '@coreui/react'

import { KEY } from 'src/shared/utils/platform'

interface ActionBarProps {
  onBack?: () => void
  // Where «‹» goes, by name: the step before («Despiece») or the screen the record was opened from
  // («Inicio», «Cotizaciones»), the same words as the phone header's «‹». The accessible
  // name says the verb: «Volver a Despiece». Without one, a plain «Atrás».
  backLabel?: string
  // The phone header already shows this same way back («‹ Órdenes»), so below `md` the bar leaves
  // it out and gives the room to the actions.
  backInHeader?: boolean
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  // Muted text next to a disabled "Siguiente", saying what is missing.
  nextHint?: string
  // The same, for an action of the step's own passed as `children` («Crear cotización»): shown
  // whenever it is set, since the bar cannot tell whether that button is disabled.
  hint?: string
  // Left half of the bar: the running totals, swapped for the selection actions while rows are
  // marked. Both used to cost a row of their own above the list.
  left?: ReactNode
  // Extra actions for the step (e.g. the final "Crear cotización").
  children?: ReactNode
  // On the bar itself, so a breakpoint utility can drop it without un-sticking it (a wrapper would
  // become the sticky box's containing block).
  className?: string
}

// The screen's actions, pinned to the bottom of the viewport: back on the left, the next move on
// the right, named after where it goes («‹ Despiece», «Costos ›»). The pieces list runs to dozens
// of rows, and a footer in normal flow meant scrolling the whole table to reach "Siguiente". Born
// as the optimizer wizard's footer; the quote and the order detail mount the same bar.
const ActionBar = ({
  onBack,
  backLabel,
  backInHeader,
  onNext,
  nextLabel = 'Siguiente',
  nextDisabled,
  nextHint,
  hint,
  left,
  children,
  className,
}: ActionBarProps) => {
  const shownHint = hint ?? (nextDisabled ? nextHint : undefined)
  return (
    <div className={className ? `action-bar ${className}` : 'action-bar'}>
      <div className="d-flex flex-wrap align-items-center gap-2 p-2 border rounded-3 bg-body shadow-sm">
        {/* On a phone the reason gets a line of its own, above the buttons: beside them it pushed the
          bar onto two ragged lines, so it used to be hidden there — and a dim button with no reason
          is how a seller ends up reporting that a tap did nothing. */}
        {shownHint && <div className="action-bar__hint d-sm-none">{shownHint}</div>}
        {onBack && (
          // Below `sm` the label goes and only the chevron stays: on a phone "‹ Volver a órdenes"
          // beside a status move pushed the bar onto two lines, and a two-line pinned bar is a fifth
          // of the screen. The label survives as the accessible name.
          <CButton
            color="secondary"
            variant="outline"
            type="button"
            className={backInHeader ? 'd-none d-md-inline-block' : undefined}
            title={`${KEY.alt}+←`}
            aria-label={backLabel ? `Volver a ${backLabel}` : 'Atrás'}
            onClick={onBack}
          >
            ‹<span className="d-none d-sm-inline"> {backLabel ?? 'Atrás'}</span>
          </CButton>
        )}
        {left}
        <div className="ms-auto d-flex align-items-center gap-2">
          {shownHint && (
            <span className="text-body-secondary small d-none d-sm-inline">{shownHint}</span>
          )}
          {children}
          {onNext && (
            <CButton
              color="primary"
              type="button"
              disabled={nextDisabled}
              title={nextDisabled ? nextHint : `${KEY.alt}+→`}
              onClick={onNext}
            >
              {nextLabel} ›
            </CButton>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActionBar
