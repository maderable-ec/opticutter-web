import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMove, cilReload, cilTrash, cilX } from '@coreui/icons'

// What can be done with the piece that was clicked, right next to it. A selection shows the
// actions instead of starting one: the piece stays where it is until the seller picks a verb (or
// drags it). A disabled action says why in its tooltip, on a wrapper, since a disabled button fires
// no pointer events.
//
// Positioned from the piece's own element on every animation frame, so it follows the zoom, the
// pan and any re-layout without hooking into any of them: one `getBoundingClientRect` per frame,
// and a state update only when the position actually changed.

interface PieceToolbarProps {
  // The element the toolbar is positioned in (relative), holding the sheet.
  container: RefObject<HTMLDivElement | null>
  pieceId: string
  title: string
  canRotate: boolean
  busy: boolean
  onMove: () => void
  onRotate: () => void
  onRemove: () => void
  onClose: () => void
}

const GAP = 8

const PieceToolbar = ({
  container,
  pieceId,
  title,
  canRotate,
  busy,
  onMove,
  onRotate,
  onRemove,
  onClose,
}: PieceToolbarProps) => {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const host = container.current
      const piece = host?.querySelector(`[data-piece-id="${CSS.escape(pieceId)}"] rect`)
      const bar = barRef.current
      if (host && piece && bar) {
        const h = host.getBoundingClientRect()
        const r = piece.getBoundingClientRect()
        // Above the piece when there is room, below it otherwise; never out of the sheet's column.
        let top = r.top - h.top - bar.offsetHeight - GAP
        if (top < 0) top = r.bottom - h.top + GAP
        const half = bar.offsetWidth / 2
        const left = Math.min(Math.max(r.left - h.left + r.width / 2, half), h.width - half)
        setPos((prev) =>
          prev && Math.abs(prev.left - left) < 0.5 && Math.abs(prev.top - top) < 0.5
            ? prev
            : { left, top },
        )
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [container, pieceId])

  return (
    <div
      ref={barRef}
      className="d-flex align-items-center gap-1 bg-body border rounded-3 shadow-sm px-2 py-1"
      style={{
        position: 'absolute',
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        transform: 'translateX(-50%)',
        visibility: pos ? 'visible' : 'hidden',
        zIndex: 3,
        whiteSpace: 'nowrap',
      }}
      // A press on the toolbar is not a press on the sheet under it.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="small fw-semibold me-1">{title}</span>
      <CButton
        size="sm"
        color="secondary"
        variant="ghost"
        onClick={onMove}
        disabled={busy}
        title="Elige dónde soltarla, en esta hoja o en otra (← →). También puedes arrastrarla."
      >
        <CIcon icon={cilMove} className="me-1" />
        Mover
      </CButton>
      <span title={canRotate ? 'Girar 90° (R)' : 'Veta fija: esta pieza no se puede girar'}>
        <CButton
          size="sm"
          color="secondary"
          variant="ghost"
          onClick={onRotate}
          disabled={busy || !canRotate}
        >
          <CIcon icon={cilReload} className="me-1" />
          Girar
        </CButton>
      </span>
      <CButton
        size="sm"
        color="secondary"
        variant="ghost"
        onClick={onRemove}
        disabled={busy}
        title="La deja en Pendientes para ubicarla después (Supr)"
      >
        <CIcon icon={cilTrash} className="me-1" />
        Quitar
      </CButton>
      <CButton
        size="sm"
        color="secondary"
        variant="ghost"
        onClick={onClose}
        aria-label="Cerrar"
        title="Cerrar (Esc)"
      >
        <CIcon icon={cilX} />
      </CButton>
    </div>
  )
}

export default PieceToolbar
