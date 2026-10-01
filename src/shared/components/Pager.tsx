import type { ReactNode } from 'react'
import { CButton } from '@coreui/react'
import Icon from 'src/shared/icons/Icon'

interface PagerProps {
  index: number
  count: number
  onChange: (index: number) => void
  // What is paged, for the buttons' names: «Hoja» gives «Hoja anterior» and «Hoja siguiente».
  noun: string
  // `lg` is the shop floor's (outlined, for a gloved hand); `sm` a floating bar's on a desktop.
  size?: 'sm' | 'lg'
  // In place of «n de N»: the cutting canvas puts its board picker there.
  label?: ReactNode
  className?: string
}

// «‹ 2 de 3 ›», the one pager of every viewer: the plan's sheets, the review's boards, the queue's
// materials and the cutting canvas. They used to be four, with four looks: one on a coral band, two
// in the footer as «‹ Anterior · 1 / 3 · Siguiente ›». The keys and the swipe that go with it are
// `usePaging`.
//
// The count is a live region, so a screen reader hears where a page turn landed. The buttons are
// 2.5rem squares (`sm`: 2rem, only from `md`, where a pointer is the norm).
const Pager = ({ index, count, onChange, noun, size, label, className = '' }: PagerProps) => (
  <div className={`pager ${size ? `pager--${size}` : ''} ${className}`}>
    <CButton
      color="secondary"
      variant={size === 'lg' ? 'outline' : 'ghost'}
      size={size}
      className="pager__btn"
      disabled={index <= 0}
      aria-label={`${noun} anterior`}
      title={`${noun} anterior (←)`}
      onClick={() => onChange(index - 1)}
    >
      <Icon name="chevronLeft" />
    </CButton>
    {label ?? (
      <span className="pager__count" aria-live="polite">
        {index + 1} de {count}
      </span>
    )}
    <CButton
      color="secondary"
      variant={size === 'lg' ? 'outline' : 'ghost'}
      size={size}
      className="pager__btn"
      disabled={index >= count - 1}
      aria-label={`${noun} siguiente`}
      title={`${noun} siguiente (→)`}
      onClick={() => onChange(index + 1)}
    >
      <Icon name="chevronRight" />
    </CButton>
  </div>
)

export default Pager
