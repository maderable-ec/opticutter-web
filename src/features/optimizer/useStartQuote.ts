import { useNavigate } from 'react-router-dom'
import { resetOptimizerSession } from 'src/shared/analytics'
import { useConfirm } from 'src/shared/hooks/useConfirm'
import { DISCARD_WORK } from './confirmations'
import { clearAutosave, loadAutosave } from './optimizerStorage'

// «Nueva cotización» from outside the optimizer (Inicio, Órdenes, Cotizaciones): a quote from zero.
// The optimizer restores its autosave on arrival, so a despiece in progress is discarded first,
// after the same question its own «Nuevo» asks; before this, the listings' button opened
// yesterday's work. «Cotizar» (the menu, the bottom bar) is the other door: the optimizer as it was
// left.
//
// Render `dialog` beside the button.
export const useStartQuote = () => {
  const navigate = useNavigate()
  const [confirm, dialog] = useConfirm()

  const start = async () => {
    // Read on the click: another tab may have left work since the screen loaded.
    if (loadAutosave()) {
      if (!(await confirm(DISCARD_WORK))) return
      clearAutosave()
      // The funnel's "opened the diagram" marks belong to the work just discarded.
      resetOptimizerSession()
    }
    void navigate('/preorders/new')
  }

  return { startQuote: () => void start(), dialog }
}
