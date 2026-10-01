import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { CCloseButton } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

import { STEPS } from './useOptimizerWizard'
import type { StepId } from './useOptimizerWizard'

// Step indicator. Built from plain buttons rather than CoreUI's CTabs: a tab has two states and a
// step has three (done / current / locked), and CoreUI free ships no stepper.
//
// One compact line — small marker, label beside it, a short connector — rather than a row of big
// circles spread across the page: it has to say where the seller is without competing with the work.
// It sits at the start of the page's first row, with the actions menu at the other end.
//
// A locked step still answers a tap. It used to be a disabled button with its reason in a `title`,
// which a phone never shows: the tap did nothing and said nothing. Now it is `aria-disabled` — it
// keeps its focus and its clicks — and a click prints the reason on a line under the trail.

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
}: WizardStepsProps) => {
  // The locked step last tapped, and the step the seller was on then. The line only speaks while
  // both still hold — moving to another step, or the step opening up, retires it with no effect.
  const [tapped, setTapped] = useState<{ id: StepId; at: number } | null>(null)
  const noticeId = useId()
  const tappedIndex = tapped ? STEPS.findIndex((s) => s.id === tapped.id) : -1
  const notice =
    tapped && tapped.at === index && tappedIndex > maxIndex ? blockedReasonFor(tapped.id) : null

  return (
    <>
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
                    aria-disabled={locked || undefined}
                    aria-current={i === index ? 'step' : undefined}
                    // Below `md` only the current step keeps its label, so the name has to live
                    // here too for the markers that are down to a number.
                    aria-label={s.label}
                    aria-describedby={
                      locked && notice && tapped?.id === s.id ? noticeId : undefined
                    }
                    title={locked ? blockedReasonFor(s.id) : undefined}
                    onClick={() => {
                      if (locked) {
                        setTapped({ id: s.id, at: index })
                        return
                      }
                      setTapped(null)
                      onSelect(s.id)
                    }}
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

      {notice && tapped && (
        <div id={noticeId} className="wizard-notice" role="status">
          <Icon name="lock" className="flex-shrink-0" />
          <span>
            <strong>{STEPS[tappedIndex]?.label}:</strong> {notice}.
          </span>
          <CCloseButton
            className="ms-auto flex-shrink-0"
            aria-label="Cerrar aviso"
            onClick={() => setTapped(null)}
          />
        </div>
      )}
    </>
  )
}

export default WizardSteps
