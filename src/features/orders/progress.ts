import type { StatusConfigEntry } from 'src/shared/components/StatusBadge'
import type { CutProgress } from './types'

// A cut's progress as the three places that draw it read it: the shop-floor card, the canvas's top
// bar and the production row of the order detail. One module so the bar never says "done" on one
// screen and "running" on the next.

export const cutPct = ({ cutPieces, totalPieces }: CutProgress): number =>
  totalPieces > 0 ? Math.round((cutPieces / totalPieces) * 100) : 0

export const isCutDone = ({ cutPieces, totalPieces }: CutProgress): boolean =>
  totalPieces > 0 && cutPieces >= totalPieces

/**
 * The bar wears the order's own tones: amber while the cut runs — the colour of «En proceso» and of
 * the board card's spine — and green once every piece is off the saw. Never coral: coral is the
 * action («Tomar», «Abrir corte»), and a coral bar over a coral button read as one more of them.
 */
export const cutBarColor = (progress: CutProgress): 'warning' | 'success' =>
  isCutDone(progress) ? 'success' : 'warning'

/**
 * One board's state in the canvas's board picker, drawn the way an activity is (clock · play ·
 * check) so it is told by shape and not by colour alone. The count is the word — «3/9» is what the
 * operador scans that list for — until the board is done and says so. The buttons it sits on used to
 * carry the state as their own colour, coral for a board under way: the action's colour on a state.
 */
export const boardCutState = (progress: CutProgress): StatusConfigEntry => {
  if (isCutDone(progress)) return { tone: 'success', icon: 'done', label: 'Listo' }
  const label = `${progress.cutPieces}/${progress.totalPieces}`
  return progress.cutPieces > 0
    ? { tone: 'progress', icon: 'inProgress', label }
    : { tone: 'neutral', icon: 'pending', label }
}
