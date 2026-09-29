import type { ReactNode } from 'react'
import { CButton } from '@coreui/react'

import { KEY } from 'src/shared/utils/platform'
import { STEPS } from './useOptimizerWizard'
import type { StepId } from './useOptimizerWizard'

// Step indicator. Built from plain buttons rather than CoreUI's CTabs: a tab has two states and a
// step has three (done / current / locked), and CoreUI free ships no stepper.
//
// One compact line — small marker, label beside it, a short connector — rather than a row of big
// circles spread across the page: it has to say where the seller is without competing with the work.
// It sits at the start of the page's first row, with the actions menu at the other end.

interface WizardStepsProps {
  index: number
  // Furthest reachable step; anything past it is locked and explains why.
  maxIndex: number
  // Why a locked step is locked. From the wizard rather than from `STEPS`: Cotización has two
  // different answers (no result yet vs. missing tapacantos) and its static text only covers one.
  blockedReasonFor: (id: StepId) => string
  onSelect: (id: StepId) => void
  // The page's actions menu. It rides on this row because the row exists anyway — the alternative
  // was a toolbar of its own, which is exactly what the redesign removed. It has to stay inside the
  // page: the app header sits outside the fullscreen element and is never painted there.
  actions?: ReactNode
}

const WizardSteps = ({
  index,
  maxIndex,
  blockedReasonFor,
  onSelect,
  actions,
}: WizardStepsProps) => (
  <div className="wizard-bar">
    <nav aria-label="Pasos del optimizador" style={{ minWidth: 0 }}>
      <ol className="wizard-steps">
        {STEPS.map((s, i) => {
          const state = i < index ? 'done' : i === index ? 'current' : 'todo'
          const locked = i > maxIndex
          return (
            <li key={s.id} className="wizard-step" data-state={state}>
              <button
                type="button"
                className="wizard-step-hit"
                disabled={locked}
                aria-current={i === index ? 'step' : undefined}
                // Below `md` only the current step keeps its label, so the name has to live here
                // too for the markers that are down to a number.
                aria-label={s.label}
                title={locked ? blockedReasonFor(s.id) : undefined}
                onClick={() => onSelect(s.id)}
              >
                <span className="wizard-step-marker" aria-hidden="true">
                  {state === 'done' ? '✓' : i + 1}
                </span>
                {/* A phone cannot carry four labels beside the menu: there the markers show the
                    progress and only the step on screen is named. */}
                <span
                  className={`wizard-step-label${i === index ? '' : ' d-none d-md-inline'}`}
                  aria-hidden="true"
                >
                  {s.label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>

    {actions && <div className="ms-auto">{actions}</div>}
  </div>
)

interface WizardFooterProps {
  onBack?: () => void
  // Defaults to "Atrás" (a step back). The pre-order page leaves the record entirely, so it says so.
  backLabel?: string
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  // Muted text next to a disabled "Siguiente", saying what is missing.
  nextHint?: string
  // Left half of the bar: the running totals, swapped for the selection actions while rows are
  // marked. Both used to cost a row of their own above the list.
  left?: ReactNode
  // Extra actions for the step (e.g. the final "Crear cotización").
  children?: ReactNode
}

// Pinned to the bottom of the viewport: the pieces list runs to dozens of rows, and a footer in
// normal flow means scrolling the whole table to reach "Siguiente" — where it also ended up flush
// against the app's own footer. The pre-order detail page mounts the same bar (it had a near-copy,
// OptimizeActionBar, that sat at the sticky z-tier and painted over its own dropdowns).
export const WizardFooter = ({
  onBack,
  backLabel = 'Atrás',
  onNext,
  nextLabel = 'Siguiente',
  nextDisabled,
  nextHint,
  left,
  children,
}: WizardFooterProps) => (
  <div className="wizard-footer">
    <div className="d-flex flex-wrap align-items-center gap-2 p-2 border rounded-3 bg-body shadow-sm">
      {onBack && (
        // Below `sm` the label goes and only the chevron stays: on a phone "‹ Volver a órdenes"
        // beside a status move pushed the bar onto two lines, and a two-line pinned bar is a fifth
        // of the screen. The label survives as the accessible name.
        <CButton
          color="secondary"
          variant="outline"
          type="button"
          title={`${KEY.alt}+←`}
          aria-label={backLabel}
          onClick={onBack}
        >
          ‹<span className="d-none d-sm-inline"> {backLabel}</span>
        </CButton>
      )}
      {left}
      <div className="ms-auto d-flex align-items-center gap-2">
        {nextHint && nextDisabled && (
          <span className="text-body-secondary small d-none d-sm-inline">{nextHint}</span>
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

export default WizardSteps
