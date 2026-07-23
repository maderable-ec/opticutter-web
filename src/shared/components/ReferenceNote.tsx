// The `notes` field of a quote/order used as its commercial reference: project or site name,
// the differentiator when the same client has several jobs running. Renders nothing when empty,
// so every call site can drop it in unconditionally.

interface ReferenceNoteProps {
  notes?: string | null
  // `subtitle`: one truncated line under the code in a table (full text on hover).
  // `header`: labelled line for a detail header, clamped to two lines.
  variant?: 'subtitle' | 'header'
  // Width cap for the `subtitle` variant, so a long reference doesn't stretch the column.
  maxWidth?: number
  className?: string
}

// Bootstrap has no line-clamp utility, so the two-line clamp is inline.
const clampTwoLines = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
}

const ReferenceNote = ({
  notes,
  variant = 'subtitle',
  maxWidth = 260,
  className = '',
}: ReferenceNoteProps) => {
  const text = notes?.trim()
  if (!text) return null

  if (variant === 'header') {
    return (
      <div className={`text-body-secondary small ${className}`} style={clampTwoLines} title={text}>
        Referencia: <strong className="text-body">{text}</strong>
      </div>
    )
  }

  return (
    <div
      className={`text-body-secondary small text-truncate ${className}`}
      style={{ maxWidth }}
      title={text}
    >
      {text}
    </div>
  )
}

export default ReferenceNote
