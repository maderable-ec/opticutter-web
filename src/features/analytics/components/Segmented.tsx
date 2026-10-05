interface SegmentedProps<T extends string> {
  // What the choice is about, for a screen reader («Período»).
  label: string
  items: { id: T; label: string }[]
  // Null when none applies (a hand-picked range is no preset).
  value: T | null
  onChange: (next: T) => void
  // Two per row below `sm`, for four labels that would not fit a phone on one line.
  wrap?: boolean
}

// One choice among a few, all in view: the period presets, the granularity, the metric a chart
// plots. The track and the lifted segment of the record pages' `Segments`, but a group of toggle
// buttons (`aria-pressed`) rather than tabs, since nothing here swaps a panel.
const Segmented = <T extends string>({
  label,
  items,
  value,
  onChange,
  wrap = false,
}: SegmentedProps<T>) => (
  <div
    className={`segments segments--toggle${wrap ? ' segments--wrap' : ''}`}
    role="group"
    aria-label={label}
  >
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        className="segments__item"
        aria-pressed={item.id === value}
        onClick={() => onChange(item.id)}
      >
        {item.label}
      </button>
    ))}
  </div>
)

export default Segmented
