// Which branch leads a row of the comparison. Pure, so the rule is pinned by a test rather than
// read off a screenshot.

// What «better» means for a figure: more sales, fewer stopped hours, or neither (a start time).
export type Better = 'higher' | 'lower' | 'none'

/**
 * The index of the branch that leads, or null when nobody does: a single branch, a figure with no
 * «better», every value equal (a tie leads nothing — the mark would be a coin toss) or all of them
 * zero (an empty period has no winner).
 */
export const leaderIndex = (values: number[], better: Better): number | null => {
  if (better === 'none' || values.length < 2) return null
  if (values.every((v) => v === 0)) return null
  const best = better === 'higher' ? Math.max(...values) : Math.min(...values)
  const leaders = values.filter((v) => v === best)
  return leaders.length === 1 ? values.indexOf(best) : null
}
