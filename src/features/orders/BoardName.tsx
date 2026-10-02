import { Fragment } from 'react'

import { stripHalfSuffix } from 'src/shared/utils/halfBoard'

interface BoardNameProps {
  productName: string
}

// A board's catalogue name, for the Taller, where it is printed in full and wraps. A line may
// break after a hyphen that follows a letter (Unicode 15.1), and every catalogue name carries one:
// `(2.44X2.15)M-15MM` split into `…M-` and `15MM`, the sheet's measure torn from its thickness. So
// the words with a hyphen are held whole; the rest still break between words. The text itself is
// untouched (the spaces stay between the spans), so it reads, copies and matches as the name.
const BoardName = ({ productName }: BoardNameProps) => (
  <>
    {(stripHalfSuffix(productName) ?? '').split(' ').map((word, i) => (
      <Fragment key={i}>
        {i > 0 && ' '}
        {word.includes('-') ? <span className="text-nowrap">{word}</span> : word}
      </Fragment>
    ))}
  </>
)

export default BoardName
