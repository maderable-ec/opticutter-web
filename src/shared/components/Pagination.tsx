import { CButton } from '@coreui/react'

interface PaginationProps {
  offset: number
  limit: number
  total: number | undefined
  onChange: (offset: number) => void
}

// Offset/limit prev-next pager shared by the list pages. Renders nothing on a single page.
const Pagination = ({ offset, limit, total, onChange }: PaginationProps) => {
  const showPrev = offset > 0
  const showNext = total != null ? offset + limit < total : false
  if (!showPrev && !showNext) return null

  return (
    <div className="d-flex justify-content-end gap-2 mt-2">
      <CButton
        size="sm"
        color="secondary"
        disabled={!showPrev}
        onClick={() => onChange(Math.max(0, offset - limit))}
      >
        Anterior
      </CButton>
      <CButton
        size="sm"
        color="secondary"
        disabled={!showNext}
        onClick={() => onChange(offset + limit)}
      >
        Siguiente
      </CButton>
    </div>
  )
}

export default Pagination
